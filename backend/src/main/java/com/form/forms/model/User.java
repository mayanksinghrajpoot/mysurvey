package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String name;

    @Indexed(unique = true)
    private String username;

    private String password;

    private Role role;

    // Hierarchy fields
    private String parentId; // The ID of the user who created this user
    private String organizationId; // The ID of the Corporate ADMIN (for PMs and NGOs)

    // Many-to-Many: List of PMs this NGO is associated with
    private java.util.Set<String> associatedPmIds = new java.util.HashSet<>();

    // For manual creation
    private java.util.Date createdAt = new java.util.Date();

    public java.util.Set<String> getAssociatedPmIds() {
        return associatedPmIds;
    }

    public void setAssociatedPmIds(java.util.Set<String> associatedPmIds) {
        this.associatedPmIds = associatedPmIds;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public java.util.Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(java.util.Date createdAt) {
        this.createdAt = createdAt;
    }
}
