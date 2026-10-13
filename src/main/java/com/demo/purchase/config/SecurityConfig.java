package com.demo.purchase.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.filter.OncePerRequestFilter;

import com.demo.purchase.dao.MemberLoginMapper;

@Configuration
public class SecurityConfig {

    // ── M2M Token ────────────────────────────────────────────────────────────
    @Value("${hub.test-api-token:}")
    private String testApiToken;

    /**
     * M2M 전용 FilterChain — POST /api/modernization/test-results 만 처리.
     * Order(1)로 기존 Session 체인(Order 기본값=최하위) 보다 먼저 매칭.
     * CSRF는 이 체인에서만 비활성화(전체 비활성화 아님).
     * Bearer token 검증 실패/누락 → 401 JSON. 토큰값은 로그에 남기지 않는다.
     */
    @Bean @Order(1)
    SecurityFilterChain m2mFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher(org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
                .pathPattern(org.springframework.http.HttpMethod.POST, "/api/modernization/test-results"))
            .authorizeHttpRequests(a -> a.anyRequest().authenticated())
            .csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(
                org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
            .addFilterBefore(new OncePerRequestFilter() {
                @Override
                protected void doFilterInternal(HttpServletRequest req,
                        HttpServletResponse res, FilterChain chain) throws IOException, jakarta.servlet.ServletException {
                    String header = req.getHeader("Authorization");
                    String token = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
                    if (token == null || testApiToken.isBlank()
                            || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),
                                                      testApiToken.getBytes(StandardCharsets.UTF_8))) {
                        res.setContentType("application/json");
                        res.setStatus(HttpStatus.UNAUTHORIZED.value());
                        res.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\"}");
                        return;
                    }
                    var auth = new AbstractAuthenticationToken(
                            java.util.List.of(new SimpleGrantedAuthority("ROLE_TEST_PUBLISHER"))) {
                        { super.setAuthenticated(true); }
                        @Override public Object getCredentials() { return null; }
                        @Override public Object getPrincipal() { return "test-publisher"; }
                    };
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    chain.doFilter(req, res);
                }
            }, BasicAuthenticationFilter.class)
            .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
                res.setContentType("application/json");
                res.setStatus(HttpStatus.UNAUTHORIZED.value());
                res.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\"}");
            }));
        return http.build();
    }

    // ── 기존 Session 체인 ─────────────────────────────────────────────────────
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
