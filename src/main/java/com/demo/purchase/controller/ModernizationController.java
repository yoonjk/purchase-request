package com.demo.purchase.controller;
import com.demo.purchase.service.ModernizationService;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/modernization")
public class ModernizationController {
 private final ModernizationService service;
 public ModernizationController(ModernizationService service){this.service=service;}
 private void page(int page,int size){if(page<0||size<1||size>100||page>100000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid pagination");}
 private void admin(org.springframework.security.core.Authentication auth){if(auth==null||auth.getAuthorities().stream().noneMatch(a->"ROLE_ADMIN".equals(a.getAuthority())))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Admin required");}
 private ResponseStatusException invalid(Exception e){return new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());}
 @GetMapping("/applications") public Map<String,Object> apps(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){page(page,size);return service.applications(q,page,size);}
 @GetMapping("/applications/{id}") public Map<String,Object> app(@PathVariable String id){var d=service.application(id);if(d==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);return d;}
 @PostMapping("/applications") public ResponseEntity<?> addApp(@RequestBody Map<String,Object> d,org.springframework.security.core.Authentication auth){admin(auth);try{service.saveApplication(d,false);return ResponseEntity.status(201).body(Map.of("applicationId",d.get("applicationId")));}catch(IllegalArgumentException e){throw invalid(e);}}
 @PutMapping("/applications/{id}") public Map<String,Object> editApp(@PathVariable String id,@RequestBody Map<String,Object> d,org.springframework.security.core.Authentication auth){admin(auth);d.put("applicationId",id);try{service.saveApplication(d,true);return Map.of("applicationId",id);}catch(IllegalArgumentException e){throw invalid(e);}}
 @DeleteMapping("/applications/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delApp(@PathVariable String id,org.springframework.security.core.Authentication auth){admin(auth);try{service.deleteApplication(id);}catch(IllegalArgumentException e){throw invalid(e);}}
 @GetMapping("/libraries") public Map<String,Object> libs(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="") String type,@RequestParam(defaultValue="") String applicationId,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){page(page,size);if(!type.isEmpty()&&!Set.of("MAVEN_CENTRAL","INTERNAL","SOLUTION").contains(type))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid type");return service.libraries(q,type,applicationId,status,page,size);}
 @GetMapping("/libraries/{id}") public Map<String,Object> lib(@PathVariable long id){var d=service.library(id);if(d==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);return d;}
 @PostMapping("/libraries") public ResponseEntity<?> addLib(@RequestBody Map<String,Object> d,org.springframework.security.core.Authentication auth){admin(auth);try{return ResponseEntity.status(201).body(Map.of("libraryId",service.saveLibrary(d,false)));}catch(IllegalArgumentException e){throw invalid(e);}}
 @PutMapping("/libraries/{id}") public Map<String,Object> editLib(@PathVariable long id,@RequestBody Map<String,Object> d,org.springframework.security.core.Authentication auth){admin(auth);d.put("libraryId",id);try{service.saveLibrary(d,true);return Map.of("libraryId",id);}catch(IllegalArgumentException e){throw invalid(e);}}
 @DeleteMapping("/libraries/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delLib(@PathVariable long id,org.springframework.security.core.Authentication auth){admin(auth);try{service.deleteLibrary(id);}catch(IllegalArgumentException e){throw invalid(e);}}
 public record LinkRequest(String usedVersion){}
 @PutMapping("/applications/{appId}/libraries/{libraryId}") public Map<String,Object> link(@PathVariable String appId,@PathVariable long libraryId,@RequestBody LinkRequest body,org.springframework.security.core.Authentication auth){admin(auth);try{service.link(appId,libraryId,body.usedVersion());return Map.of("linked",true);}catch(IllegalArgumentException e){throw invalid(e);}}
 @DeleteMapping("/applications/{appId}/libraries/{libraryId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void unlink(@PathVariable String appId,@PathVariable long libraryId,org.springframework.security.core.Authentication auth){admin(auth);service.unlink(appId,libraryId);}
}
