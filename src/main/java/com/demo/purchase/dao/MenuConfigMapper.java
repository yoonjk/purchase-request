package com.demo.purchase.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MenuConfigMapper {
    record MenuConfig(String menuCode, String menuName, Boolean visible, Integer sortOrder, Boolean deleted) {}
    List<MenuConfig> findAll();
    List<MenuConfig> findAllIncludingDeleted();
    int updateMenu(@Param("code") String code, @Param("name") String name,
                   @Param("visible") boolean visible, @Param("sortOrder") int sortOrder);
    int softDelete(@Param("code") String code);
    int restore(@Param("code") String code);
}
