package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.util.Date;

@Document(collection = "projects")
public class Project {
    @Id
    private String id;

    private String name;
    private String description;

    @Indexed
    private String organizationId; // Points to the Corporate Admin (Tenant)

    @Indexed
    // List of Project Managers assigned to this project
    private java.util.Set<String> projectManagerIds = new java.util.HashSet<>();

    private ProjectStatus status = ProjectStatus.ACTIVE;

    private java.util.Date createdAt = new java.util.Date();
    private java.util.Date updatedAt;

    // Getters and Setters

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public java.util.Set<String> getProjectManagerIds() {
        return projectManagerIds;
    }

    public void setProjectManagerIds(java.util.Set<String> projectManagerIds) {
        this.projectManagerIds = projectManagerIds;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}
