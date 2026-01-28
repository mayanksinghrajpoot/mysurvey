package com.form.forms.repository;

import com.form.forms.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);

    // Find all users belonging to an organization (for partial visibility)
    java.util.List<User> findByOrganizationId(String organizationId);

    // Find direct children (for PM listing)
    java.util.List<User> findByParentId(String parentId);
}
