package com.demo.purchase.dao;

import com.demo.purchase.dao.vo.PurchaseRequest;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PurchaseRequestMapper {

    int insert(PurchaseRequest request);

    List<PurchaseRequest> findAll();

    PurchaseRequest findById(@Param("id") Long id);

    PurchaseRequest findByIdForUpdate(@Param("id") Long id);

    int updateTotals(
        @Param("id") Long id,
        @Param("total") java.math.BigDecimal total,
        @Param("status") String status
    );

    PurchaseRequest findByIdAndRunId(
        @Param("requestId") Long requestId,
        @Param("testRunId") String testRunId
    );
}