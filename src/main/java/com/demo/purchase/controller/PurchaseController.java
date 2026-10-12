package com.demo.purchase.controller;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.demo.purchase.dao.PurchaseRequestMapper;
import com.demo.purchase.dao.vo.PurchaseRequest;
import com.demo.purchase.service.PurchaseApprovalService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api")
public class PurchaseController {
    private final PurchaseRequestMapper mapper;
    private final PurchaseApprovalService approvalService;

    public PurchaseController(PurchaseRequestMapper mapper, PurchaseApprovalService approvalService) {
        this.mapper = mapper;
        this.approvalService = approvalService;
    }
    public record PurchaseInput(String requester, String test_run_id,
        BigDecimal amount,
        BigDecimal budget) {}
    public record PurchaseOutput(long request_id, String requester, String test_run_id,
        BigDecimal amount, BigDecimal budget, String status) {}

    @GetMapping("/health")
    public Map<String,String> health() { return Map.of("status", "UP"); }

    @PostMapping("/purchase-requests")
    public ResponseEntity<PurchaseOutput> create(@Valid @RequestBody PurchaseInput input) {
        // Do not log requester names, amounts, budgets or full request bodies.
        String runId = input == null ? null : input.test_run_id();
        if (runId == null || !runId.matches("[A-Za-z0-9_-]{1,64}")) {
            log.warn("purchase.create.invalid_test_run_id");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid test_run_id");
        }
        log.info("purchase.create.started testRunId={}", runId);
        try {
            var request = new PurchaseRequest();
            request.setRequester(input.requester());
            request.setTestRunId(runId);
            request.setTotalAmount(input.amount());
            request.setBudget(input.budget());
            request.setStatus(approvalService.evaluate(input.amount(), input.budget()));
            log.info("purchase.create.evaluated testRunId={} status={}", runId, request.getStatus());
            if (mapper.insert(request) != 1 || request.getRequestId() == null) {
                log.error("purchase.create.insert_failed testRunId={}", runId);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Insert failed");
            }
            log.info("purchase.create.completed requestId={} testRunId={} status={}",
                request.getRequestId(), runId, request.getStatus());
            return ResponseEntity.status(HttpStatus.CREATED).body(toOutput(request));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IllegalArgumentException ex) {
            log.warn("purchase.create.invalid_input testRunId={} reason={}", runId, ex.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid purchase input", ex);
        } catch (RuntimeException ex) {
            log.error("purchase.create.failed testRunId={} exceptionType={}", runId,
                ex.getClass().getSimpleName(), ex);
            throw ex;
        }
    }

    @GetMapping("/purchase-requests/{id}")
    public PurchaseOutput get(@PathVariable long id, @RequestParam("test_run_id") String runId) {
        // Log only the database identifier; the correlation ID is validated on creation.
        log.info("purchase.lookup.started requestId={}", id);
        try {
            var request = mapper.findByIdAndRunId(id, runId);
            if (request == null) {
                log.warn("purchase.lookup.not_found requestId={}", id);
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
            }
            log.info("purchase.lookup.completed requestId={} status={}", id, request.getStatus());
            return toOutput(request);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("purchase.lookup.failed requestId={} exceptionType={}", id,
                ex.getClass().getSimpleName(), ex);
            throw ex;
        }
    }


    private static PurchaseOutput toOutput(PurchaseRequest r) {
        return new PurchaseOutput(r.getRequestId(), r.getRequester(), r.getTestRunId(),
            r.getTotalAmount(), r.getBudget(), r.getStatus());
    }
}
