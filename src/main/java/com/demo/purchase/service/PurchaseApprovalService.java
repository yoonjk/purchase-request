package com.demo.purchase.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PurchaseApprovalService {
    private static final BigDecimal AUTO_LIMIT = new BigDecimal("1000000");

    public String evaluate(BigDecimal amount, BigDecimal budget) {
        if (amount == null || budget == null || amount.signum() <= 0 || budget.signum() < 0) {
        	log.warn("purchase.approval.invalid_amount_or_budget");
        	throw new IllegalArgumentException("Invalid amount or budget");
        }
        String status = amount.compareTo(budget) > 0 ? "REJECTED"
                : amount.compareTo(AUTO_LIMIT) <= 0 ? "AUTO_APPROVED" : "PENDING_APPROVAL";
        log.info("purchase.approval.evaluated status={}", status);
        
        return status;
            
            
    }
}
