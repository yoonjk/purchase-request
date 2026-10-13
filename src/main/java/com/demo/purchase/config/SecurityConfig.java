package com.demo.purchase.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;

import com.demo.purchase.dao.MemberLoginMapper;

@Configuration
public class SecurityConfig {
    @Value("${hub.admin-login-ids:}")
    private String adminLoginIds;

    private boolean isAdmin(String loginId) {
        Set<String> ids = Arrays.stream(adminLoginIds.split(","))
            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toSet());
        return ids.contains(loginId);
    }
 

    /** 실패 원인을 안전한 코드로만 전달한다. 예외 메시지, 세션 ID는 노출하지 않는다. */
    private AuthenticationFailureHandler loginFailureHandler() {
        return (req, res, ex) -> {
            String code = ex instanceof BadCredentialsException ? "INVALID_CREDENTIALS" : "AUTH_ERROR";
            res.sendRedirect("/login.html?error=" + code);
        };
    }

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		return http
				.authorizeHttpRequests(
						a -> a.requestMatchers("/login.html", "/css/**", "/js/**", "/error", "/api/auth/csrf")
								.permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
				.formLogin(f -> f.loginPage("/login.html").loginProcessingUrl("/login")
						.defaultSuccessUrl("/dashboard.html", true).failureHandler(loginFailureHandler()))
				.logout(l -> l.logoutUrl("/logout").logoutSuccessUrl("/login.html?logout").invalidateHttpSession(true))
				.csrf(c -> c
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
				.exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
					if (req.getRequestURI().startsWith("/api/"))
						res.sendError(HttpStatus.UNAUTHORIZED.value());
					else
						res.sendRedirect("/login.html");
				})).build();
	}

	@Bean
	UserDetailsService userDetailsService(MemberLoginMapper mapper) {
		return username -> {
			var member = mapper.findByLoginId(username);
			if (member == null)
				throw new org.springframework.security.core.userdetails.UsernameNotFoundException(
						"Invalid credentials");
			return User.withUsername(member.loginId()).password(member.passwordHash())
					.disabled(!"Y".equalsIgnoreCase(member.activeYn()))
                    .roles(isAdmin(member.loginId()) ? new String[]{"USER", "ADMIN"} : new String[]{"USER"}).build();
		};
	}

	/** 기존 SHA-256(64자리 HEX) 비밀번호 검증용 PasswordEncoder */
	@Bean
	PasswordEncoder passwordEncoder() {
		return new PasswordEncoder() {

			@Override
			public String encode(CharSequence rawPassword) {
				if (rawPassword == null) {
					throw new IllegalArgumentException("Password must not be null");
				}

				try {
					byte[] digest = MessageDigest.getInstance("SHA-256")
							.digest(rawPassword.toString().getBytes(StandardCharsets.UTF_8));

					return HexFormat.of().formatHex(digest);

				} catch (NoSuchAlgorithmException e) {
					throw new IllegalStateException("SHA-256 algorithm unavailable", e);
				}
			}

			@Override
			public boolean matches(CharSequence rawPassword, String encodedPassword) {

				if (rawPassword == null || encodedPassword == null || !encodedPassword.matches("(?i)[0-9a-f]{64}")) {
					return false;
				}

				byte[] calculated = HexFormat.of().parseHex(encode(rawPassword));

				byte[] stored = HexFormat.of().parseHex(encodedPassword.toLowerCase(Locale.ROOT));

				return MessageDigest.isEqual(calculated, stored);
			}
		};
	}
}
