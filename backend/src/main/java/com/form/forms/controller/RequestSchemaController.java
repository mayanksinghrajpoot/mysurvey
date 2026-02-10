package com.form.forms.controller;

import com.form.forms.model.RequestSchema;
import com.form.forms.service.RequestSchemaService;
import com.form.forms.model.User;
import com.form.forms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.Map;

@RestController
@RequestMapping("/api/schemas")
public class RequestSchemaController {

    @Autowired
    private RequestSchemaService requestSchemaService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public RequestSchema saveSchema(@RequestBody Map<String, Object> payload) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User admin = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        // For Admin, their ID is the tenantId
        String tenantId = admin.getId();

        String typeStr = (String) payload.get("type");
        String schemaJson = (String) payload.get("schemaJson");
        RequestSchema.SchemaType type = RequestSchema.SchemaType.valueOf(typeStr);

        return requestSchemaService.saveSchema(tenantId, type, schemaJson);
    }

    @GetMapping
    public ResponseEntity<RequestSchema> getSchema(@RequestParam String tenantId, @RequestParam String type) {
        RequestSchema.SchemaType schemaType = RequestSchema.SchemaType.valueOf(type);
        return requestSchemaService.getSchema(tenantId, schemaType)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(null)); // Return 200 with null body if not found, or 204 No Content
    }
}
