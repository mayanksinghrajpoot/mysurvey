package com.form.forms.repository;

import com.form.forms.model.RequestSchema;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;
import java.util.List;

public interface RequestSchemaRepository extends MongoRepository<RequestSchema, String> {
    Optional<RequestSchema> findByTenantIdAndType(String tenantId, RequestSchema.SchemaType type);

    List<RequestSchema> findByTenantId(String tenantId);
}
