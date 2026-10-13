package com.demo.purchase.dao;

import java.time.LocalDate;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface HrMapper {
    record Employee(
            String employeeId,
            String name,
            String department,
            String managerId,
            Integer annualLeaveDays,
            Integer usedLeaveDays
        ) {}

	record LeaveEntry(Long leaveId, String employeeId, LocalDate startDate, LocalDate endDate, Integer days,
			String reason, String status, java.time.LocalDateTime createdAt) {
	}

	List<Employee> employees();

	Employee employee(@Param("id") String id);

	Employee employeeForUpdate(@Param("id") String id);

	int create(Employee e);

	Long lastInsertId();

	int update(Employee e);

	int delete(@Param("id") String id);

	List<LeaveEntry> leaves(@Param("employeeId") String employeeId);

	LeaveEntry leaveForUpdate(@Param("id") long id);

	int addLeave(LeaveEntry e);

	int cancelLeave(@Param("id") long id);

	int updateLeave(LeaveEntry e);

	int deleteCancelledLeave(@Param("id") long id);

	int incrementUsed(@Param("id") String id, @Param("days") int days);
}
