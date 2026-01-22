package com.form.forms.service;

import com.form.forms.model.Tenant;
import com.form.forms.repository.TenantRepository;
import com.form.forms.security.JwtTokenProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final TenantRepository tenantRepository;
    private final JwtTokenProvider tokenProvider;

    public AuthService(TenantRepository tenantRepository, JwtTokenProvider tokenProvider) {
        this.tenantRepository = tenantRepository;
        this.tokenProvider = tokenProvider;
    }

    public String login(String username, String password) {
        username = username.trim();
        password = password.trim();
        System.out.println("Attempting login for: " + username);
        // Authenticate tenant (Mock password check for now)
        Optional<Tenant> tenantOpt = tenantRepository.findByAdminUsername(username);

        if (tenantOpt.isPresent()) {
            Tenant tenant = tenantOpt.get();
            System.out.println("User found: " + tenant.getAdminUsername());
            // In real app, use PasswordEncoder.matches(password, tenant.getPassword())
            if (password.equals(tenant.getPassword())) {
                System.out.println("Password match successful");
                Authentication authentication = new UsernamePasswordAuthenticationToken(username, password);
                SecurityContextHolder.getContext().setAuthentication(authentication);
                return tokenProvider.generateToken(authentication, tenant.getId(), tenant.getRole());
            } else {
                System.out.println("Password mismatch");
                throw new RuntimeException("Password mismatch for user: " + username);
            }
        } else {
            System.out.println("User not found in DB");
            throw new RuntimeException("User not found: " + username);
        }
    }

    public Tenant register(String name, String username, String password, String role) {
        username = username.trim();
        password = password.trim();
        if (tenantRepository.findByAdminUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setAdminUsername(username);
        tenant.setPassword(password); // Should encode

        if (role != null && !role.isEmpty()) {
            tenant.setRole(role.toUpperCase());
        } else {
            tenant.setRole("USER");
        }

        return tenantRepository.save(tenant);
    }

    public java.util.List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }
}
