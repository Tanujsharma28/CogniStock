package com.cognistock.backend.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.cognistock.backend.filter.JwtAuthFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/nlbi/**").permitAll()
                .requestMatchers("/api/morning-brief/**").permitAll()

                // ── ADMIN ONLY ──
                .requestMatchers("/api/settings/**").hasRole("ADMIN")
                .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")
                .requestMatchers("/api/simulate/**").hasRole("ADMIN")

                // ── MANAGER + ADMIN ──
                .requestMatchers("/api/suppliers/**").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers("/api/decisions/**").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers("/api/auto-po/**").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers("/api/orchestrator/**").hasAnyRole("ADMIN", "MANAGER")

                .requestMatchers(HttpMethod.POST, "/api/products/**").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAnyRole("ADMIN", "MANAGER")

                .requestMatchers(HttpMethod.POST, "/api/orders").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers(HttpMethod.PATCH, "/api/orders/*/status").hasAnyRole("ADMIN", "MANAGER")

                .requestMatchers(HttpMethod.POST, "/api/pricing/apply/**").hasAnyRole("ADMIN", "MANAGER")

                // ── Existing rules (untouched) ──
                .requestMatchers(HttpMethod.GET, "/api/ai-decisions", "/api/ai-decisions/**")
                    .hasAnyRole("ADMIN", "MANAGER", "STAFF", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/ai-decisions/*/decide")
                    .hasAnyRole("ADMIN", "MANAGER")

                // ── Everything else: any logged-in role ──
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized")
                )
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}