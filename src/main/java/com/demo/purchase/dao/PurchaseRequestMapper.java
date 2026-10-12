package com.demo.purchase.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.demo.purchase.dao.vo.PurchaseRequest;

@Mapper
public interface PurchaseRequestMapper {
    int insert(PurchaseRequest request);
    PurchaseRequest findByIdAndRunId(@Param("requestId") long requestId,
                                     @Param("testRunId") String testRunId);
}