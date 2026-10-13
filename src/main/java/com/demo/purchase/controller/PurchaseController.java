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
        if (input == null || input.test_run_id() == null || !input.test_run_id().matches("[A-Za-z0-9_-]{1,64}") || input.requester() == null || input.requester().isBlank() || input.requester().length()>100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid test_run_id");
        var request = new PurchaseRequest();
        request.setRequester(input.requester());
        request.setTestRunId(input.test_run_id());
        request.setTotalAmount(input.amount());
        request.setBudget(input.budget());
        request.setStatus(approvalService.evaluate(input.amount(), input.budget()));
        if (mapper.insert(request) != 1 || request.getRequestId() == null)
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Insert failed");
        return ResponseEntity.status(HttpStatus.CREATED).body(toOutput(request));
    }

    @GetMapping("/purchase-requests/{id}")
    public PurchaseOutput get(@PathVariable long id, @RequestParam("test_run_id") String runId) {
        var request = mapper.findByIdAndRunId(id, runId);
        if (request == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        return toOutput(request);
    }

    private static PurchaseOutput toOutput(PurchaseRequest r) {
        return new PurchaseOutput(r.getRequestId(), r.getRequester(), r.getTestRunId(),
            r.getTotalAmount(), r.getBudget(), r.getStatus());
    }
}
