package com.form.forms.repository;

import com.form.forms.model.Tenant;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface TenantRepository extends MongoRepository<Tenant, String> {
    Optional<Tenant> findByAdminUsername(String adminUsername);
}
