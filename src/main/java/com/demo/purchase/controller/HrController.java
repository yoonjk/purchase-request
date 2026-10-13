package com.demo.purchase.controller;

import com.demo.purchase.service.HrService;
import com.demo.purchase.dao.MemberLoginMapper;
import org.springframework.security.core.Authentication;
import java.time.LocalDate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/hr")
public class HrController {
    private final HrService service;
    private final MemberLoginMapper memberMapper;
    public HrController(HrService service, MemberLoginMapper memberMapper){this.service=service;this.memberMapper=memberMapper;}
    private String currentEmployeeId(Authentication authentication){
        var member=memberMapper.findByLoginId(authentication.getName());
        if(member==null||member.loginId()==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"로그인 계정과 연결된 임직원이 없습니다");
        return member.loginId();
    }
    @GetMapping("/me") public Object me(Authentication auth){return service.employee(currentEmployeeId(auth));}
    @GetMapping("/me/leaves") public Object myLeaves(Authentication auth){return service.leaves(currentEmployeeId(auth));}

    public record EmployeeInput(String employeeId,String name,String department,String managerId,Integer annualLeaveDays){}
    public record LeaveInput(LocalDate startDate,LocalDate endDate,Integer days,String reason){}
    @GetMapping("/employees") public Object all(){return service.employees();}
    @GetMapping("/employees/{id}") public Object one(@PathVariable String id){return service.employee(id);}
    @PostMapping("/employees") @ResponseStatus(HttpStatus.CREATED) public Object create(@RequestBody EmployeeInput input){return service.create(input.employeeId(),input.name(),input.department(),input.managerId(),input.annualLeaveDays());}
    @PutMapping("/employees/{id}") public Object update(@PathVariable String id,@RequestBody EmployeeInput input){return service.update(id,input.name(),input.department(),input.managerId(),input.annualLeaveDays());}
    @DeleteMapping("/employees/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable String id){
        try{service.delete(id);}catch(DataIntegrityViolationException ex){throw new ResponseStatusException(HttpStatus.CONFLICT,"관리자 또는 연차 이력이 연결된 직원은 삭제할 수 없습니다",ex);}
    }
    @GetMapping("/employees/{id}/leaves") public Object leaves(@PathVariable String id){return service.leaves(id);}
    @PostMapping("/employees/{id}/leaves") @ResponseStatus(HttpStatus.CREATED) public Object addLeave(@PathVariable String id,@RequestBody LeaveInput input){return service.addLeave(id,input.startDate(),input.endDate(),input.days(),input.reason());}
    @PutMapping("/leaves/{id}") public Object updateLeave(@PathVariable long id,@RequestBody LeaveInput input){return service.updateLeave(id,input.startDate(),input.endDate(),input.days(),input.reason());}
    @DeleteMapping("/leaves/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteLeave(@PathVariable long id){service.deleteLeave(id);}
    @PostMapping("/leaves/{id}/cancel") @ResponseStatus(HttpStatus.NO_CONTENT) public void cancel(@PathVariable long id){service.cancelLeave(id);}
}
