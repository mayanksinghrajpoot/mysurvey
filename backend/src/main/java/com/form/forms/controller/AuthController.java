package com.form.forms.controller;

import com.form.forms.model.Tenant;
import com.form.forms.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> creds) {
        try {
            String token = authService.login(creds.get("username"), creds.get("password"));
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            e.printStackTrace(); // Log the error for debugging
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Tenant> register(@RequestBody Map<String, String> payload) {
        // Simple registration for demo
        return ResponseEntity.ok(authService.register(
                payload.get("name"),
                payload.get("username"),
                payload.get("password"),
                payload.get("role")));
    }

    @GetMapping("/tenants")
    public ResponseEntity<java.util.List<Tenant>> getAllTenants() {
        return ResponseEntity.ok(authService.getAllTenants());
    }
}
