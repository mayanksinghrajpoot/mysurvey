package com.form.forms.security;

import com.form.forms.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromJWT(jwt);
                String tenantId = tokenProvider.getTenantIdFromJWT(jwt);
                String role = tokenProvider.getRoleFromJWT(jwt);

                // Tenant Context Logic
                if ("ADMIN".equals(role)) {
                    // Admin can see all, or impersonate specific tenant
                    String headerTenant = TenantContext.getTenantId();

                    // If header is set (by TenantFilter earlier), we let it be (Impersonation).
                    // If header is NOT set, we might want to clear it to allow "All" query?
                    // TenantFilter runs before this. If header was present, Context is set.
                    // If header was missing, Context is empty/null.

                    // So for Admin, we basically do NOTHING to enforce restrictions.
                    // We just verify the header is valid if we want to be strict, but for now we
                    // trust the filter/client.

                    // Optional: If Admin and NO header, we could explicitly set a "GLOBAL" context
                    // if our repositories need it, but likely null context = global.
                } else {
                    // Regular User: MUST be restricted to their tenant
                    if (tenantId != null) {
                        TenantContext.setTenantId(tenantId);
                    }
                }

                // Create authorities based on role
                java.util.List<org.springframework.security.core.GrantedAuthority> authorities = new ArrayList<>();
                if (role != null) {
                    authorities.add(
                            new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role));
                }

                UserDetails userDetails = new User(username, "", authorities);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
