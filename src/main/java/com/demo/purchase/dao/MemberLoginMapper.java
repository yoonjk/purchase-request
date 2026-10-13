package com.demo.purchase.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberLoginMapper {

    record MemberLogin(
        Long memberId,
        String loginId,
        String passwordHash,
        String activeYn,
        String investmentProfile
    ) {}

    MemberLogin findByLoginId(
        @Param("loginId") String loginId
    );
}