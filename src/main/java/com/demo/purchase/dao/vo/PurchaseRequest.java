package com.demo.purchase.dao.vo;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class PurchaseRequest {
	private Long requestId;
	private String requester;
	private String testRunId;
	private BigDecimal totalAmount;
	private BigDecimal budget;
	private String status;
}
