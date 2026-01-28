package com.form.forms.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class OrganizationFilter extends OncePerRequestFilter {

    public static final String ORGANIZATION_HEADER = "X-ORGANIZATION-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String organizationId = request.getHeader(ORGANIZATION_HEADER);

        if (organizationId != null && !organizationId.isEmpty()) {
            OrganizationContext.setOrganizationId(organizationId);
        } else {
            // For now, allow requests without org for public endpoints like login
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            OrganizationContext.clear();
        }
    }
}
