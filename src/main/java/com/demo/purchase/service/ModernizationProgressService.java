package com.demo.purchase.service;

import com.demo.purchase.dao.ModernizationProgressMapper;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModernizationProgressService {
    private static final Set<String> PHASES = Set.of("ANALYSIS","PLANNING","TRANSFORMATION","TESTING","DEPLOYMENT");
    private static final Set<String> STATUSES = Set.of("NOT_STARTED","IN_PROGRESS","BLOCKED","COMPLETED");
    private final ModernizationProgressMapper mapper;
    public ModernizationProgressService(ModernizationProgressMapper mapper) { this.mapper = mapper; }
    public Map<String,Object> list(String q,String status,int page,int size) {
        if (!status.isBlank() && !STATUSES.contains(status)) throw new IllegalArgumentException("Invalid status");
        long total=mapper.count(q,status);
        return Map.of("page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,
            "content",mapper.list(q,status,page*size,size));
    }
    public Map<String,Object> summary() { return mapper.summary(); }
    public Map<String,Object> detail(String id) { return mapper.find(id); }
    public java.util.List<Map<String,Object>> history(String id) { return mapper.historyList(id); }
    @Transactional
    public void save(String id, Map<String,Object> body, String actor) {
        if (mapper.applicationExists(id)==0) throw new IllegalArgumentException("Application not found");
        String phase=String.valueOf(body.getOrDefault("phase",""));
        String status=String.valueOf(body.getOrDefault("status",""));
        if (!PHASES.contains(phase) || !STATUSES.contains(status)) throw new IllegalArgumentException("Invalid phase or status");
        int percent;
        try { percent=Integer.parseInt(String.valueOf(body.get("progressPercent"))); }
        catch (Exception e) { throw new IllegalArgumentException("progressPercent must be integer 0..100"); }
        if(percent<0||percent>100) throw new IllegalArgumentException("progressPercent out of range");
        if(status.equals("COMPLETED") && percent!=100) throw new IllegalArgumentException("COMPLETED requires 100%");
        if(status.equals("NOT_STARTED") && percent!=0) throw new IllegalArgumentException("NOT_STARTED requires 0%");
        String owner=clean(body.get("ownerName"),120), notes=clean(body.get("notes"),4000);
        String end=clean(body.get("plannedEndDate"),10);
        if(end!=null) { try { LocalDate.parse(end); } catch(Exception e) { throw new IllegalArgumentException("Invalid plannedEndDate (YYYY-MM-DD)"); } }
        Map<String,Object> old=mapper.find(id);
        Map<String,Object> values=new HashMap<>();
        values.put("applicationId",id);values.put("phase",phase);values.put("status",status);
        values.put("progressPercent",percent);values.put("ownerName",owner);values.put("plannedEndDate",end);
        values.put("notes",notes);values.put("updatedBy",actor);
        values.put("oldPhase",old==null?null:old.get("phase"));values.put("oldStatus",old==null?null:old.get("status"));
        values.put("oldPercent",old==null?null:old.get("progressPercent"));
        mapper.upsert(values);mapper.history(values);
    }
    private String clean(Object value,int max) {
        if(value==null || String.valueOf(value).isBlank()) return null;
        String s=String.valueOf(value).trim();
        if(s.length()>max) throw new IllegalArgumentException("Field too long");
        return s;
    }
}
