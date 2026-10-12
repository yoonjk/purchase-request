package com.demo.purchase;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@MapperScan("com.demo.purchase.dao")
@SpringBootApplication
public class PurchaseRequestApplication {

	public static void main(String[] args) {
		SpringApplication.run(PurchaseRequestApplication.class, args);
	}

}
