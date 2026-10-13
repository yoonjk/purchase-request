package com.demo.purchase.dao;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ModernizationReportMapper {
 Map<String,Object> portfolio();
 List<Map<String,Object>> phases();
 List<Map<String,Object>> statuses();
 List<Map<String,Object>> compatibility();
 List<Map<String,Object>> types();
 List<Map<String,Object>> risks();
 List<Map<String,Object>> applications();
 List<Map<String,Object>> changes();
}
