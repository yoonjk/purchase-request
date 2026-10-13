package com.demo.purchase.dao;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ModernizationProgressMapper {
    List<Map<String,Object>> list(@Param("q") String q, @Param("status") String status,
        @Param("offset") int offset, @Param("size") int size);
    long count(@Param("q") String q, @Param("status") String status);
    Map<String,Object> find(@Param("id") String id);
    int applicationExists(@Param("id") String id);
    int upsert(Map<String,Object> values);
    int history(Map<String,Object> values);
    List<Map<String,Object>> historyList(@Param("id") String id);
    Map<String,Object> summary();
}
