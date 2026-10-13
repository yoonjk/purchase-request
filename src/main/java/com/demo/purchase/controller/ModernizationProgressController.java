package com.demo.purchase.controller;

import com.demo.purchase.service.ModernizationProgressService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/modernization/progress")
public class ModernizationProgressController {
    private final ModernizationProgressService service;
    public ModernizationProgressController(ModernizationProgressService service) { this.service=service; }
    @GetMapping public Map<String,Object> list(@RequestParam(defaultValue="") String q,
        @RequestParam(defaultValue="") String status,@RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="20") int size) {
        if(page<0 || page>100000 || size<1 || size>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid pagination");
        try { return service.list(q,status,page,size); }
        catch(IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage()); }
    }
    @GetMapping("/summary") public Map<String,Object> summary() { return service.summary(); }
    @GetMapping("/{id}") public Map<String,Object> detail(@PathVariable String id) {
        Map<String,Object> result=service.detail(id);
        if(result==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No progress record");
        return result;
    }
    @GetMapping("/{id}/history") public java.util.List<Map<String,Object>> history(@PathVariable String id) { return service.history(id); }
    @PutMapping("/{id}") public Map<String,Object> save(@PathVariable String id,@RequestBody Map<String,Object> body,Authentication auth) {
        if(auth==null || auth.getAuthorities().stream().noneMatch(a->a.getAuthority().equals("ROLE_ADMIN")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Admin required");
        try { service.save(id,body,auth.getName());return Map.of("applicationId",id,"saved",true); }
        catch(IllegalArgumentException e) {
            if("Application not found".equals(e.getMessage())) throw new ResponseStatusException(HttpStatus.NOT_FOUND,e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());
        }
    }
}
