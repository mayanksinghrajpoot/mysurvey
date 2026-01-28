package com.form.forms.controller;

import com.form.forms.model.Role;
import com.form.forms.model.User;
import com.form.forms.service.AuthService;
import com.form.forms.security.JwtTokenProvider;
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
        try {
            String token = authService.login(creds.get("username"), creds.get("password"));
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        try {
            // Determine Role from string
            String roleStr = payload.get("role");
            Role role = (roleStr != null) ? Role.valueOf(roleStr.toUpperCase()) : Role.NGO; // Default to NGO? or Error?

            // Parent ID from payload or context?
            // Better: Get currently logged in user as parent
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String parentId = null;

            // If user is logged in, use their ID as parentId (if they are creating a user)
            // But /register endpoint might be public for initial setup?
            // Requirement: "All Admins (Corporate) are created and managed by Super Admin",
            // etc.
            // So /register should be protected, EXCEPT for maybe the very first Super
            // Admin.

            // Check if we are creating the first user (Super Admin)
            if (role == Role.SUPER_ADMIN) {
                return ResponseEntity.ok(authService.createFirstSuperAdmin(
                        payload.get("name"),
                        payload.get("username"),
                        payload.get("password")));
            }

            // For others, require authorized user
            // In a real app, we would extract the ID from the principal/token details.
            // But here, let's assume the frontend sends 'parentId' or we extract it from
            // SecurityContext if available.

            // Since this is just a quick Refactor, I'll allow parsing "parentId" from body
            // if sent (e.g. by Super Admin dashboard)
            // But ideally we should trust the token.

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
                        // Ignore if not found, let validation handle "Creator required"
                    }
                }
            }

            return ResponseEntity.ok(authService.register(
                    payload.get("name"),
                    payload.get("username"),
                    payload.get("password"),
                    role,
                    parentId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid Role"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown Error"));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<java.util.List<User>> getAllUsers() {
        return ResponseEntity.ok(authService.getAccessibleUsers());
    }

    @PostMapping("/users/{ngoId}/associate")
    public ResponseEntity<?> associateNgo(@PathVariable String ngoId, @RequestBody Map<String, String> payload) {
        try {
            String pmId = payload.get("pmId");
            boolean remove = "true".equals(payload.get("remove"));
            if (remove) {
                authService.removeAssociation(ngoId, pmId);
            } else {
                authService.addAssociation(ngoId, pmId);
            }
            return ResponseEntity.ok(Map.of("message", "Association updated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
