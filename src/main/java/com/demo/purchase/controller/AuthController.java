package com.demo.purchase.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	@GetMapping("/me")
	public Map<String, String> me(Authentication auth) {
		return Map.of("loginId", auth.getName());
	}

	@GetMapping("/csrf")
	public Map<String, String> csrf(HttpServletRequest req) {
		CsrfToken token = (CsrfToken) req.getAttribute(CsrfToken.class.getName());
		return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
	}
}
