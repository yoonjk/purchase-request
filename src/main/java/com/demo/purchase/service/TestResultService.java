package com.demo.purchase.service;

import com.demo.purchase.dao.TestResultMapper;
import com.demo.purchase.dao.TestResultMapper.TestResult;
import com.demo.purchase.dao.TestResultMapper.TestRun;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Test Result Collector. 입력은 tests/run-newman.js, tests/run-playwright.js 가 만든 정규화 JSON 이다.
 * Report 본문을 신뢰하지 않고 모든 필드를 검증한 뒤 필요한 값만 저장한다.
 */
@Service
public class TestResultService {

    public static final int MAX_TESTS = 2000;
    private static final int SUPPORTED_SCHEMA = 1;
    private static final Set<String> MODULES = Set.of("PURCHASE", "HR");
    private static final Set<String> TYPES = Set.of("API", "UI");
    private static final Set<String> STATUSES = Set.of("passed", "failed", "skipped");
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS");
    private static final Pattern EXECUTION_ID = Pattern.compile("[A-Za-z0-9._:-]{8,100}");
    private static final Pattern APP_ID = Pattern.compile("[A-Za-z0-9_-]{1,40}");
    private static final ZoneId ZONE = ZoneId.of("UTC");

    /** 검증 실패. 컨트롤러가 400으로 변환한다. 메시지는 클라이언트에 노출해도 안전한 문구만 쓴다. */
    public static class InvalidReportException extends RuntimeException {
        public InvalidReportException(String message) { super(message); }
    }

    /** 같은 execution_id 에 다른 내용이 도착한 경우. 컨트롤러가 409로 변환한다. */
    public static class ExecutionConflictException extends RuntimeException {
        public ExecutionConflictException(String message) { super(message); }
    }

    public record UploadResult(long runId, String executionId, boolean duplicate) {}

    private final TestResultMapper mapper;
    private final ObjectMapper json;

    public TestResultService(TestResultMapper mapper, ObjectMapper json) {
        this.mapper = mapper;
        this.json = json;
    }

    @Transactional
    public UploadResult upload(String executionId, String applicationId, JsonNode report) {
        if (executionId == null || !EXECUTION_ID.matcher(executionId).matches())
            throw new InvalidReportException("executionId 형식이 올바르지 않습니다");
        if (applicationId == null || !APP_ID.matcher(applicationId).matches())
            throw new InvalidReportException("applicationId 형식이 올바르지 않습니다");
        if (report == null || !report.isObject()) throw new InvalidReportException("Report 형식이 올바르지 않습니다");

        TestRun run = validateRun(executionId, applicationId, report);
        List<JsonNode> tests = validateTests(report, run);
        String hash = hash(executionId, applicationId, report);
        run = withHash(run, hash);

        var existing = mapper.findRunByExecutionId(executionId);
        if (existing != null) return resolveExisting(existing, hash, executionId);

        try {
            mapper.insertRun(run);
        } catch (DuplicateKeyException race) {
            // 동시 요청이 먼저 커밋한 경우: 같은 내용이면 멱등 성공, 다르면 충돌
            var winner = mapper.findRunByExecutionId(executionId);
            if (winner == null) throw race;
            return resolveExisting(winner, hash, executionId);
        }
        long runId = mapper.lastInsertId();
        List<TestResult> rows = new ArrayList<>(tests.size());
        for (JsonNode t : tests) rows.add(toResult(runId, t));
        if (!rows.isEmpty()) mapper.insertResults(rows);
        return new UploadResult(runId, executionId, false);
    }

    private UploadResult resolveExisting(Map<String, Object> existing, String hash, String executionId) {
        if (!hash.equals(existing.get("contentHash")))
            throw new ExecutionConflictException("동일한 executionId로 다른 내용의 결과가 이미 등록되어 있습니다");
        return new UploadResult(((Number) existing.get("runId")).longValue(), executionId, true);
    }

    // ── 검증 ───────────────────────────────────────────────────────────────

    private TestRun validateRun(String executionId, String applicationId, JsonNode r) {
        if (r.path("schemaVersion").asInt(-1) != SUPPORTED_SCHEMA)
            throw new InvalidReportException("지원하지 않는 schemaVersion 입니다");
        String module = text(r, "module").toUpperCase(Locale.ROOT);
        String type = text(r, "type").toUpperCase(Locale.ROOT);
        if (!MODULES.contains(module)) throw new InvalidReportException("module 값이 올바르지 않습니다");
        if (!TYPES.contains(type)) throw new InvalidReportException("type 값이 올바르지 않습니다");
        String framework = switch (text(r, "tool").toLowerCase(Locale.ROOT)) {
            case "newman" -> "NEWMAN";
            case "playwright" -> "PLAYWRIGHT";
            default -> throw new InvalidReportException("tool 값이 올바르지 않습니다");
        };
        if (("API".equals(type)) != ("NEWMAN".equals(framework)))
            throw new InvalidReportException("tool 과 type 조합이 올바르지 않습니다");

        LocalDateTime started = time(r, "startedAt");
        LocalDateTime finished = time(r, "finishedAt");
        if (finished.isBefore(started)) throw new InvalidReportException("finishedAt 이 startedAt 보다 빠릅니다");
        long duration = r.path("durationMs").asLong(-1);
        if (duration < 0) throw new InvalidReportException("durationMs 가 올바르지 않습니다");

        JsonNode s = r.path("stats");
        int total = count(s, "total"), passed = count(s, "passed"), failed = count(s, "failed"), skipped = count(s, "skipped");
        if (total != passed + failed + skipped) throw new InvalidReportException("stats 합계가 일치하지 않습니다");

        return new TestRun(executionId, applicationId, module, framework, type, started, finished, duration,
            total, passed, failed, skipped, failed > 0 ? "FAILED" : "PASSED", "");
    }

    private List<JsonNode> validateTests(JsonNode report, TestRun run) {
        JsonNode arr = report.path("tests");
        if (!arr.isArray()) throw new InvalidReportException("tests 가 배열이 아닙니다");
        if (arr.size() > MAX_TESTS) throw new InvalidReportException("tests 건수가 제한을 초과했습니다");
        if (arr.size() != run.totalCount()) throw new InvalidReportException("tests 건수와 stats.total 이 일치하지 않습니다");
        int p = 0, f = 0, s = 0;
        List<JsonNode> out = new ArrayList<>(arr.size());
        for (JsonNode t : arr) {
            if (!t.isObject()) throw new InvalidReportException("test 항목 형식이 올바르지 않습니다");
            String st = text(t, "status");
            if (!STATUSES.contains(st)) throw new InvalidReportException("test status 가 올바르지 않습니다");
            if (text(t, "id").length() > 100 || text(t, "name").length() > 500)
                throw new InvalidReportException("test id 또는 name 길이가 제한을 초과했습니다");
            String method = t.path("method").asText(null);
            if (method != null && !METHODS.contains(method.toUpperCase(Locale.ROOT)))
                throw new InvalidReportException("test method 가 올바르지 않습니다");
            if (t.hasNonNull("httpStatus") && (t.path("httpStatus").asInt(-1) < 100 || t.path("httpStatus").asInt() > 599))
                throw new InvalidReportException("test httpStatus 가 올바르지 않습니다");
            switch (st) { case "passed" -> p++; case "failed" -> f++; default -> s++; }
            out.add(t);
        }
        if (p != run.passedCount() || f != run.failedCount() || s != run.skippedCount())
            throw new InvalidReportException("tests 상태별 건수와 stats 가 일치하지 않습니다");
        return out;
    }

    /** 허용된 필드만 복사한다. request/response body, header, assertions 상세, runError 등은 저장하지 않는다. */
    private TestResult toResult(long runId, JsonNode t) {
        String method = t.hasNonNull("method") ? t.get("method").asText().toUpperCase(Locale.ROOT) : null;
        Integer http = t.hasNonNull("httpStatus") ? t.get("httpStatus").asInt() : null;
        Long dur = t.hasNonNull("durationMs") ? Math.max(0, t.get("durationMs").asLong()) : null;
        String error = t.hasNonNull("error") ? cut(t.get("error").asText(), 2000) : null;
        String skip = t.hasNonNull("skipReason") ? cut(t.get("skipReason").asText(), 500) : null;
        return new TestResult(runId, text(t, "id"), text(t, "name"), text(t, "status"), dur, method, http, error, skip);
    }

    // ── 해시 (멱등성/충돌 판정) ─────────────────────────────────────────────

    /** 검증에 통과한 값으로만 해시한다. JSON 공백/키 순서 차이에 영향받지 않도록 정규화된 문자열을 만든다. */
    private String hash(String executionId, String applicationId, JsonNode r) {
        StringBuilder sb = new StringBuilder();
        sb.append(executionId).append('|').append(applicationId).append('|')
          .append(text(r, "module").toUpperCase(Locale.ROOT)).append('|').append(text(r, "type").toUpperCase(Locale.ROOT)).append('|')
          .append(text(r, "tool").toLowerCase(Locale.ROOT)).append('|')
          .append(time(r, "startedAt")).append('|').append(time(r, "finishedAt")).append('|').append(r.path("durationMs").asLong());
        for (JsonNode t : r.path("tests")) {
            sb.append('\n').append(text(t, "id")).append('|').append(text(t, "name")).append('|').append(text(t, "status"))
              .append('|').append(t.path("method").asText("")).append('|').append(t.path("httpStatus").asText(""))
              .append('|').append(t.path("durationMs").asText("")).append('|').append(t.path("error").asText(""))
              .append('|').append(t.path("skipReason").asText(""));
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private TestRun withHash(TestRun r, String hash) {
        return new TestRun(r.executionId(), r.applicationId(), r.module(), r.framework(), r.testType(), r.startedAt(),
            r.finishedAt(), r.durationMs(), r.totalCount(), r.passedCount(), r.failedCount(), r.skippedCount(),
            r.executionStatus(), hash);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private static String text(JsonNode n, String field) {
        JsonNode v = n.path(field);
        if (!v.isTextual() || v.asText().isBlank()) throw new InvalidReportException(field + " 값이 올바르지 않습니다");
        return v.asText().trim();
    }

    private static int count(JsonNode stats, String field) {
        JsonNode v = stats.path(field);
        if (!v.isInt() || v.asInt() < 0) throw new InvalidReportException("stats." + field + " 값이 올바르지 않습니다");
        return v.asInt();
    }

    private static LocalDateTime time(JsonNode n, String field) {
        try {
            return LocalDateTime.ofInstant(Instant.parse(text(n, field)), ZONE);
        } catch (java.time.format.DateTimeParseException e) {
            throw new InvalidReportException(field + " 형식이 올바르지 않습니다");
        }
    }

    private static String cut(String s, int max) { return s.length() <= max ? s : s.substring(0, max); }

    // ── 조회 ───────────────────────────────────────────────────────────────

    public Map<String, Object> listRuns(String module, String type, int page, int size) {
        String m = normalizeFilter(module, MODULES, "module");
        String t = normalizeFilter(type, TYPES, "type");
        long total = mapper.countRuns(m, t);
        return Map.of("page", page, "size", size, "totalElements", total, "totalPages", (total + size - 1) / size,
            "content", mapper.listRuns(m, t, page * size, size));
    }

    public Map<String, Object> runDetail(long runId, String status) {
        var run = mapper.findRunById(runId);
        if (run == null) return null;
        if (status != null && !status.isBlank() && !STATUSES.contains(status))
            throw new InvalidReportException("status 값이 올바르지 않습니다");
        return Map.of("run", run, "results", mapper.findResultsByRunId(runId, status));
    }

    /** latest: 각 (application, module, type) 의 가장 최근 Run 1건 기준. history 와 합산하지 않는다. */
    public Map<String, Object> summary() {
        return Map.of("basis", "LATEST_RUN_PER_APPLICATION_MODULE_TYPE", "latest", mapper.latestRunSummaryByApplication());
    }

    private static String normalizeFilter(String v, Set<String> allowed, String name) {
        if (v == null || v.isBlank()) return null;
        String u = v.toUpperCase(Locale.ROOT);
        if (!allowed.contains(u)) throw new InvalidReportException(name + " 값이 올바르지 않습니다");
        return u;
    }
}
