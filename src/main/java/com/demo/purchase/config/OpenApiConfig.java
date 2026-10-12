package com.demo.purchase.config;




import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI purchaseOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("IBM Bob Purchase Approval API")
                .version("1.0.0")
                .description("""
                    IBM Bob Air-gap Hands-on Lab

                    API Test: Postman Collection + Newman
                    UI Test: Playwright MCP
                    DAO: MyBatis
                    Database: MySQL demo
                    """)
                .contact(new Contact()
                    .name("IBM Bob Hands-on Lab")));
    }
}

