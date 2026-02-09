package com.form.forms.controller;

import com.form.forms.model.Role;
import com.form.forms.model.User;
import com.form.forms.service.AuthService;
import com.form.forms.exception.BadRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
        String token = authService.login(creds.get("username"), creds.get("password"));
        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        // Determine Role from string
        String roleStr = payload.get("role");
        Role role;
        try {
            role = (roleStr != null) ? Role.valueOf(roleStr.toUpperCase()) : Role.NGO;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid Role: " + roleStr);
        }

        // Check if we are creating the first user (Super Admin)
        if (role == Role.SUPER_ADMIN) {
            return ResponseEntity.ok(authService.createFirstSuperAdmin(
                    payload.get("name"),
                    payload.get("username"),
                    payload.get("password")));
        }

        String parentId = null;
        if (payload.containsKey("parentId")) {
            parentId = payload.get("parentId");
        }

        // Fallback: Use logged-in user as parent
        if (parentId == null) {
            Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();
            if (currentAuth != null && currentAuth.isAuthenticated()
                    && !"anonymousUser".equals(currentAuth.getPrincipal())) {
                try {
                    User currentUser = authService.getUserByUsername(currentAuth.getName());
                    parentId = currentUser.getId();
                } catch (Exception e) {
                    // Ignore if not found
                }
            }
        }

        return ResponseEntity.ok(authService.register(
                payload.get("name"),
                payload.get("username"),
                payload.get("password"),
                role,
                parentId));
    }

    @GetMapping("/users")
    public ResponseEntity<java.util.List<User>> getAllUsers() {
        return ResponseEntity.ok(authService.getAccessibleUsers());
    }

    @PostMapping("/users/{ngoId}/associate")
    public ResponseEntity<?> associateNgo(@PathVariable String ngoId, @RequestBody Map<String, String> payload) {
        String pmId = payload.get("pmId");
        boolean remove = "true".equals(payload.get("remove"));
        if (remove) {
            authService.removeAssociation(ngoId, pmId);
        } else {
            authService.addAssociation(ngoId, pmId);
        }
        return ResponseEntity.ok(Map.of("message", "Association updated"));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String username = payload.get("username");
        String roleStr = payload.get("role");
        Role role = null;
        if (roleStr != null) {
            try {
                role = Role.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Ignore invalid role or throw? Let's ignore and keep old role if invalid
            }
        }

        return ResponseEntity.ok(authService.updateUser(id, name, username, role));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        authService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
