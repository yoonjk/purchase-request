package com.demo.purchase.dao;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TestResultMapper {

    /** 동일 execution_id 존재 여부 확인 */
    Map<String, Object> findRunByExecutionId(@Param("executionId") String executionId);

    /** Run INSERT. run_id는 같은 트랜잭션에서 lastInsertId()로 조회 (record는 불변) */
    int insertRun(TestRun run);

    long lastInsertId();

    /** 개별 테스트 결과 배치 INSERT */
    int insertResults(@Param("results") List<TestResult> results);

    /** Run 목록 조회 (최신순) */
    List<Map<String, Object>> listRuns(
        @Param("module") String module,
        @Param("testType") String testType,
        @Param("offset") int offset,
        @Param("size") int size
    );

    long countRuns(@Param("module") String module, @Param("testType") String testType);

    /** 특정 Run 조회 */
    Map<String, Object> findRunById(@Param("runId") long runId);

    /** 특정 Run의 테스트 결과 목록 */
    List<Map<String, Object>> findResultsByRunId(
        @Param("runId") long runId,
        @Param("status") String status
    );

    /** Application별 최신 Run 요약 */
    List<Map<String, Object>> latestRunSummaryByApplication();

    /** module+type 기준 최신 Run (단건) */
    Map<String, Object> latestRunByModuleAndType(
        @Param("module") String module,
        @Param("testType") String testType
    );

    // ── inner records (DTO) ────────────────────────────────────────────────

    record TestRun(
        String executionId,
        String applicationId,
        String module,
        String framework,
        String testType,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        long durationMs,
        int totalCount,
        int passedCount,
        int failedCount,
        int skippedCount,
        String executionStatus,  // "PASSED" | "FAILED"
        String contentHash       // SHA-256 hex of canonical report JSON
    ) {}

    record TestResult(
        long runId,
        String testCaseKey,
        String testName,
        String status,           // "passed" | "failed" | "skipped"
        Long durationMs,
        String httpMethod,
        Integer httpStatus,
        String errorSummary,
        String skipReason
    ) {}
}
