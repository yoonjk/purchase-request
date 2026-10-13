package com.demo.purchase.controller;

import com.demo.purchase.service.TestResultService;
import com.demo.purchase.service.TestResultService.ExecutionConflictException;
import com.demo.purchase.service.TestResultService.InvalidReportException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Test Result Collector.
 *  - POST : M2M Bearer Token 인증(SecurityConfig.m2mFilterChain). 브라우저 세션/CSRF 와 무관.
 *  - GET  : 기존 로그인 세션 인증(기본 체인).
 * 클라이언트에는 한국어 안전 메시지만 반환하고 SQL/Stack Trace 는 노출하지 않는다.
 */
@RestController
@RequestMapping("/api/modernization/test-results")
public class TestResultController {

    private final TestResultService service;

    public TestResultController(TestResultService service) { this.service = service; }

    /** Publisher 가 reports/*.json 본문을 그대로 report 에 담아 전송한다. */
    public record UploadRequest(String executionId, String applicationId, JsonNode report) {}

    @PostMapping
    public ResponseEntity<Map<String, Object>> upload(@RequestBody UploadRequest req) {
        try {
            var r = service.upload(req.executionId(), req.applicationId(), req.report());
            // 신규 201, 동일 내용 재전송 200 (멱등)
            return ResponseEntity.status(r.duplicate() ? HttpStatus.OK : HttpStatus.CREATED).body(Map.of(
                "runId", r.runId(), "executionId", r.executionId(), "duplicate", r.duplicate()));
        } catch (InvalidReportException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (ExecutionConflictException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // FK 위반(등록되지 않은 applicationId) 등. DB 메시지는 노출하지 않는다.
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "등록되지 않은 Application 이거나 저장할 수 없는 데이터입니다");
        }
    }

    @GetMapping("/runs")
    public Map<String, Object> runs(@RequestParam(defaultValue = "") String module,
                                    @RequestParam(defaultValue = "") String type,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "페이지 값이 올바르지 않습니다");
        try {
            return service.listRuns(module, type, page, size);
        } catch (InvalidReportException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/runs/{runId}")
    public Map<String, Object> run(@PathVariable long runId, @RequestParam(defaultValue = "") String status) {
        try {
            var d = service.runDetail(runId, status);
            if (d == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "실행 이력을 찾을 수 없습니다");
            return d;
        } catch (InvalidReportException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() { return service.summary(); }
}
