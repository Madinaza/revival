package dev.revival.security;

import dev.revival.common.RateLimiter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import org.springframework.web.filter.OncePerRequestFilter;

/** Slows down password guessing and form spam, per client address. */
class ThrottleFilter extends OncePerRequestFilter {
    private final RateLimiter signIn, submit, lookUp;

    ThrottleFilter(Clock clock) {
        signIn = new RateLimiter(10, Duration.ofMinutes(10), clock);
        lookUp = new RateLimiter(20, Duration.ofMinutes(10), clock);
        submit = new RateLimiter(20, Duration.ofMinutes(10), clock);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        var limiter = !"POST".equals(req.getMethod()) ? null : switch (path(req)) {
            case "/api/login" -> signIn;
            case "/api/designs", "/api/test-drives" -> submit;
            case "/api/my-request", "/api/my-request/move", "/api/my-request/cancel" -> lookUp;
            default -> null;
        };
        if (limiter != null && !limiter.allow(req.getRemoteAddr())) {
            res.setStatus(429);
            res.setHeader("Retry-After", "600");
            res.setContentType("application/problem+json");
            res.getWriter().write("{\"status\":429,\"title\":\"Too Many Requests\",\"detail\":\"Too many attempts. Try again in ten minutes.\"}");
            return;
        }
        chain.doFilter(req, res);
        if (limiter == signIn && res.getStatus() == 204) signIn.reset(req.getRemoteAddr());
    }

    /** The decoded path, so that an escaped spelling of it is counted too. */
    private static String path(HttpServletRequest req) {
        return req.getServletPath() + (req.getPathInfo() == null ? "" : req.getPathInfo());
    }
}
