package dev.revival.security;

import java.time.Clock;
import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.header.HeaderWriterFilter;

@Configuration
class SecurityConfig {
    @Bean
    SecurityFilterChain api(HttpSecurity http, Clock clock) throws Exception {
        return http
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/catalog", "/api/availability", "/api/designs/*", "/api/session", "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/designs", "/api/test-drives", "/api/my-request", "/api/my-request/*").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().denyAll())
            // Public forms carry no session, so there is nothing for a forged request to abuse.
            .csrf(c -> c.spa().ignoringRequestMatchers("/api/designs", "/api/test-drives", "/api/my-request", "/api/my-request/*"))
            .formLogin(f -> f.loginProcessingUrl("/api/login")
                .successHandler((req, res, who) -> res.setStatus(204))
                .failureHandler((req, res, e) -> res.setStatus(401)))
            .logout(l -> l.logoutUrl("/api/logout").logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .requestCache(r -> r.disable())
            .addFilterAfter(new ThrottleFilter(clock), HeaderWriterFilter.class)
            .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetails(AdminUsers users) {
        return name -> users.findByUsername(name.strip().toLowerCase(Locale.ROOT))
            .map(u -> User.withUsername(u.username()).password(u.passwordHash()).roles("ADMIN").build())
            .orElseThrow(() -> new UsernameNotFoundException("unknown"));
    }
}
