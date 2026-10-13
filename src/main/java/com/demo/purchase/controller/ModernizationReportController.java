package com.demo.purchase.controller;
import com.demo.purchase.service.ModernizationReportService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
@RequestMapping("/api/modernization/reports")
public class ModernizationReportController {
 private final ModernizationReportService service;
 public ModernizationReportController(ModernizationReportService service){this.service=service;}
 @GetMapping("/overview") public Map<String,Object> overview(){return service.report();}
}
