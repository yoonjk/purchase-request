package com.demo.purchase.service;

import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class PurchaseApprovalService {
    private static final BigDecimal AUTO_LIMIT = new BigDecimal("1000000");

    public String evaluate(BigDecimal amount, BigDecimal budget) {
        if (amount == null || budget == null || amount.signum() <= 0 || budget.signum() < 0) {
            throw new IllegalArgumentException("Invalid amount or budget");
        }
        if (amount.compareTo(budget) > 0) return "REJECTED";
        return amount.compareTo(AUTO_LIMIT) <= 0 ? "AUTO_APPROVED" : "PENDING_APPROVAL";
    }
}
