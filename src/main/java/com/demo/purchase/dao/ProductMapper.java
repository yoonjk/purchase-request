package com.demo.purchase.dao;

import java.math.BigDecimal;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ProductMapper {

    record Product(
        String sku,
        String name,
        BigDecimal unitPrice,
        boolean active
    ) {}

    List<Product> all();

    Product one(@Param("sku") String sku);

    int add(Product product);

    int edit(Product product);

    int remove(@Param("sku") String sku);
}