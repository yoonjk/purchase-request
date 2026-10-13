package com.demo.purchase.service;

import com.demo.purchase.dao.HrMapper;
import com.demo.purchase.dao.HrMapper.Employee;
import com.demo.purchase.dao.HrMapper.LeaveEntry;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HrService {
    private final HrMapper mapper;
    public HrService(HrMapper mapper) { this.mapper=mapper; }
    public List<Employee> employees() { return mapper.employees(); }
    public Employee employee(String id) { var e=mapper.employee(id); if(e==null) throw fail(HttpStatus.NOT_FOUND,"직원을 찾을 수 없습니다"); return e; }
    private ResponseStatusException fail(HttpStatus status,String message){return new ResponseStatusException(status,message);}
    private void validateId(String id){if(id==null||!id.matches("[A-Za-z0-9_-]{1,10}"))throw fail(HttpStatus.BAD_REQUEST,"직원 ID는 영문, 숫자, _ 또는 - 조합으로 10자 이내여야 합니다");}
    private void validate(String name,String department,Integer annual){
        if(name==null||name.isBlank()||name.length()>100||department==null||department.isBlank()||department.length()>100||annual==null||annual<0||annual>365) throw fail(HttpStatus.BAD_REQUEST,"직원 정보가 올바르지 않습니다");
    }
    @Transactional public Employee create(String id,String name,String department,String managerId,Integer annual){
        validate(name,department,annual);
        validateId(id);
        if(managerId!=null) employee(managerId);
        var e=new Employee(id,name.trim(),department.trim(),managerId,annual,0);
        mapper.create(e); return employee(id);
    }
    @Transactional public Employee update(String id,String name,String department,String managerId,Integer annual){
        validate(name,department,annual);
        var old=mapper.employeeForUpdate(id);
        if(old==null) throw fail(HttpStatus.NOT_FOUND,"직원을 찾을 수 없습니다");
        if(annual<old.usedLeaveDays()) throw fail(HttpStatus.CONFLICT,"연차 총량이 사용 일수보다 작습니다");
        if(managerId!=null){if(managerId.equals(id))throw fail(HttpStatus.BAD_REQUEST,"자신을 관리자로 지정할 수 없습니다");employee(managerId);}
        mapper.update(new Employee(id,name.trim(),department.trim(),managerId,annual,old.usedLeaveDays()));return employee(id);
    }
    @Transactional public void delete(String id){
        if(mapper.delete(id)==0) throw fail(HttpStatus.NOT_FOUND,"직원을 찾을 수 없습니다");
    }
    public List<LeaveEntry> leaves(String employeeId){employee(employeeId);return mapper.leaves(employeeId);}
    @Transactional public LeaveEntry addLeave(String id,LocalDate start,LocalDate end,Integer days,String reason){
        if(start==null||end==null||end.isBefore(start)||days==null||days<1||days>365||days>ChronoUnit.DAYS.between(start,end)+1||reason!=null&&reason.length()>500)
            throw fail(HttpStatus.BAD_REQUEST,"연차 기간 또는 일수가 올바르지 않습니다");
        var emp=mapper.employeeForUpdate(id);
        if(emp==null) throw fail(HttpStatus.NOT_FOUND,"직원을 찾을 수 없습니다");
        if(mapper.incrementUsed(id,days)!=1) throw fail(HttpStatus.CONFLICT,"잔여 연차가 부족합니다");
        var leave=new LeaveEntry(null,id,start,end,days,reason==null?"":reason.trim(),"APPROVED",null);
        mapper.addLeave(leave);var newId=mapper.lastInsertId();return mapper.leaves(id).stream().filter(l->l.leaveId().equals(newId)).findFirst().orElseThrow();
    }

    @Transactional public LeaveEntry updateLeave(long id,LocalDate start,LocalDate end,Integer days,String reason){
        validateLeave(start,end,days,reason);
        var leave=mapper.leaveForUpdate(id);
        if(leave==null)throw fail(HttpStatus.NOT_FOUND,"연차 내역을 찾을 수 없습니다");
        if(!"APPROVED".equals(leave.status()))throw fail(HttpStatus.CONFLICT,"취소된 연차는 수정할 수 없습니다");
        if(mapper.employeeForUpdate(leave.employeeId())==null)throw fail(HttpStatus.NOT_FOUND,"직원을 찾을 수 없습니다");
        int delta=days-leave.days();
        if(delta!=0&&mapper.incrementUsed(leave.employeeId(),delta)!=1)throw fail(HttpStatus.CONFLICT,"잔여 연차가 부족합니다");
        var changed=new LeaveEntry(id,leave.employeeId(),start,end,days,reason==null?"":reason.trim(),"APPROVED",leave.createdAt());
        if(mapper.updateLeave(changed)!=1)throw fail(HttpStatus.CONFLICT,"연차 수정에 실패했습니다");
        return mapper.leaveForUpdate(id);
    }
    @Transactional public void deleteLeave(long id){
        var leave=mapper.leaveForUpdate(id);
        if(leave==null)throw fail(HttpStatus.NOT_FOUND,"연차 내역을 찾을 수 없습니다");
        if(!"CANCELLED".equals(leave.status()))throw fail(HttpStatus.CONFLICT,"연차를 먼저 취소해야 합니다");
        if(mapper.deleteCancelledLeave(id)!=1)throw fail(HttpStatus.CONFLICT,"연차 삭제에 실패했습니다");
    }
    private void validateLeave(LocalDate start,LocalDate end,Integer days,String reason){
        if(start==null||end==null||end.isBefore(start)||days==null||days<1||days>365||days>ChronoUnit.DAYS.between(start,end)+1||(reason!=null&&reason.length()>500))throw fail(HttpStatus.BAD_REQUEST,"연차 기간 또는 일수가 올바르지 않습니다");
    }
    @Transactional public void cancelLeave(long id){
        var leave=mapper.leaveForUpdate(id);
        if(leave==null)throw fail(HttpStatus.NOT_FOUND,"연차 내역을 찾을 수 없습니다");
        if(!"APPROVED".equals(leave.status()))throw fail(HttpStatus.CONFLICT,"이미 취소된 연차입니다");
        mapper.employeeForUpdate(leave.employeeId());
        if(mapper.cancelLeave(id)!=1||mapper.incrementUsed(leave.employeeId(),-leave.days())!=1)throw fail(HttpStatus.CONFLICT,"연차 취소에 실패했습니다");
    }
}
