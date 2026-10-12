package com.demo.purchase.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/** Records API entry/exit and propagates a request-scoped correlation identifier. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class HttpRequestLoggingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(HttpRequestLoggingFilter.class);
    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(request.getContextPath() + "/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader("X-Request-ID");
        String correlationId = supplied != null && VALID_ID.matcher(supplied).matches()
                ? supplied : UUID.randomUUID().toString();
        long start = System.nanoTime();
        response.setHeader("X-Request-ID", correlationId);
        try (MDC.MDCCloseable ignored = MDC.putCloseable("requestId", correlationId)) {
            log.info("http.request.started method={} uri={}", request.getMethod(), request.getRequestURI());
            try {
                chain.doFilter(request, response);
            } finally {
                long durationMs = (System.nanoTime() - start) / 1_000_000;
                log.info("http.request.completed method={} uri={} status={} durationMs={}",
                        request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs);
            }
        }
    }
}
