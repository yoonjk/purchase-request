package com.demo.purchase.service;
import com.demo.purchase.dao.ModernizationMapper;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class ModernizationService {
 private final ModernizationMapper mapper;
 public ModernizationService(ModernizationMapper mapper){this.mapper=mapper;}
 public Map<String,Object> applications(String q,int page,int size){return result(mapper.applications(q,page*size,size),mapper.countApplications(q),page,size);}
 public Map<String,Object> libraries(String q,String type,String appId,String status,int page,int size){return result(mapper.libraries(q,type,appId,status,page*size,size),mapper.countLibraries(q,type,appId,status),page,size);}
 private Map<String,Object> result(List<Map<String,Object>> rows,long count,int page,int size){return Map.of("content",rows,"page",page,"size",size,"totalElements",count,"totalPages",(count+size-1)/size);}
 public Map<String,Object> application(String id){return mapper.application(id);}
 public Map<String,Object> library(long id){return mapper.library(id);}
 private String str(Object o){return o==null?"":o.toString().trim();}
 private void required(Map<String,Object> d,String key){if(str(d.get(key)).isEmpty())throw new IllegalArgumentException(key+" is required");}
 private void appNormalize(Map<String,Object> d){required(d,"applicationId");required(d,"applicationName");d.putIfAbsent("targetJava","21");d.putIfAbsent("targetSpring","6.x");d.putIfAbsent("targetJakarta","Jakarta EE");d.putIfAbsent("riskLevel","NOT_ASSESSED");}
 @Transactional public void saveApplication(Map<String,Object> d,boolean update){appNormalize(d);int n=update?mapper.updateApplication(d):mapper.insertApplication(d);if(n!=1)throw new IllegalArgumentException("Application not found");}
 @Transactional public void deleteApplication(String id){if(mapper.deleteApplication(id)!=1)throw new IllegalArgumentException("Application not found");}
 private void libNormalize(Map<String,Object> d){required(d,"libraryName");required(d,"libraryType");required(d,"currentVersion");String t=str(d.get("libraryType"));if(!Set.of("INTERNAL","SOLUTION","MAVEN_CENTRAL").contains(t))throw new IllegalArgumentException("Invalid libraryType");if(t.equals("INTERNAL")){String policy=str(d.get("versionPolicy"));if(policy.isEmpty()||policy.equals("KEEP")){d.put("versionPolicy","KEEP");d.put("targetVersion",d.get("currentVersion"));}else if(policy.equals("CHANGE")){required(d,"targetVersion");}else throw new IllegalArgumentException("Invalid versionPolicy");}else{d.put("versionPolicy","ASSESS");if(str(d.get("targetVersion")).isEmpty())d.put("targetVersion",null);}if(str(d.get("compatibilityStatus")).isEmpty())d.put("compatibilityStatus","NOT_TESTED");if(!Set.of("NOT_TESTED","COMPATIBLE","INCOMPATIBLE","CONDITIONAL","VENDOR_CHECK").contains(str(d.get("compatibilityStatus"))))throw new IllegalArgumentException("Invalid compatibilityStatus");}
 @Transactional public long saveLibrary(Map<String,Object> d,boolean update){libNormalize(d);int n;if(update){required(d,"libraryId");n=mapper.updateLibrary(d);}else n=mapper.insertLibrary(d);if(n!=1)throw new IllegalArgumentException("Library not found");return Long.parseLong(d.get("libraryId").toString());}
 @Transactional public void deleteLibrary(long id){if(mapper.deleteLibrary(id)!=1)throw new IllegalArgumentException("Library not found");}
 @Transactional public void link(String appId,long id,String version){if(mapper.application(appId)==null||mapper.library(id)==null)throw new IllegalArgumentException("Application or library not found");mapper.linkLibrary(appId,id,version);}
 @Transactional public void unlink(String appId,long id){mapper.unlinkLibrary(appId,id);}
}
