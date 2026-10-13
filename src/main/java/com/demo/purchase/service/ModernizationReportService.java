package com.demo.purchase.service;
import com.demo.purchase.dao.ModernizationReportMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class ModernizationReportService {
 private final ModernizationReportMapper mapper;
 public ModernizationReportService(ModernizationReportMapper mapper){this.mapper=mapper;}
 @Transactional(readOnly=true)
 public Map<String,Object> report(){
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("portfolio",mapper.portfolio());result.put("phases",mapper.phases());
  result.put("statuses",mapper.statuses());result.put("compatibility",mapper.compatibility());
  result.put("libraryTypes",mapper.types());result.put("risks",mapper.risks());
  result.put("applications",mapper.applications());result.put("changes",mapper.changes());
  return result;
 }
}
