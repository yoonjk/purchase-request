package com.demo.purchase.dao;
import java.util.*;
import org.apache.ibatis.annotations.*;
@Mapper
public interface ModernizationMapper {
 List<Map<String,Object>> applications(@Param("q") String q,@Param("offset") int offset,@Param("limit") int limit);
 long countApplications(@Param("q") String q);
 Map<String,Object> application(@Param("id") String id);
 int insertApplication(Map<String,Object> data);
 int updateApplication(Map<String,Object> data);
 int deleteApplication(@Param("id") String id);
 List<Map<String,Object>> libraries(@Param("q") String q,@Param("type") String type,@Param("appId") String appId,@Param("status") String status,@Param("offset") int offset,@Param("limit") int limit);
 long countLibraries(@Param("q") String q,@Param("type") String type,@Param("appId") String appId,@Param("status") String status);
 Map<String,Object> library(@Param("id") Long id);
 int insertLibrary(Map<String,Object> data);
 int updateLibrary(Map<String,Object> data);
 int deleteLibrary(@Param("id") Long id);
 int linkLibrary(@Param("appId") String appId,@Param("libraryId") Long libraryId,@Param("version") String version);
 int unlinkLibrary(@Param("appId") String appId,@Param("libraryId") Long libraryId);
}
