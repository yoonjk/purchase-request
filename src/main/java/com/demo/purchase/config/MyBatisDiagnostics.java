package com.demo.purchase.config;

import org.apache.ibatis.session.SqlSessionFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MyBatisDiagnostics {

    @Bean
    ApplicationRunner checkMapper(SqlSessionFactory factory) {
        return args -> {
            var configuration = factory.getConfiguration();

            String id =
                "com.demo.purchase.dao.PurchaseRequestMapper.findAll";

            System.out.println(
                "[MyBatis] findAll registered = "
                + configuration.hasStatement(id)
            );
        };
    }
}
