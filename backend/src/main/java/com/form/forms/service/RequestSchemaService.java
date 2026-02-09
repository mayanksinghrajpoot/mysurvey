package com.form.forms.service;

import com.form.forms.model.RequestSchema;
import com.form.forms.repository.RequestSchemaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class RequestSchemaService {

    @Autowired
    private RequestSchemaRepository requestSchemaRepository;

    public RequestSchema saveSchema(String tenantId, RequestSchema.SchemaType type, String schemaJson) {
        Optional<RequestSchema> existing = requestSchemaRepository.findByTenantIdAndType(tenantId, type);
        RequestSchema schema;
        if (existing.isPresent()) {
            schema = existing.get();
            schema.setSchemaJson(schemaJson);
            schema.setUpdatedAt(new java.util.Date());
        } else {
            schema = new RequestSchema(tenantId, type, schemaJson);
        }
        return requestSchemaRepository.save(schema);
    }

    public Optional<RequestSchema> getSchema(String tenantId, RequestSchema.SchemaType type) {
        return requestSchemaRepository.findByTenantIdAndType(tenantId, type);
    }
}
