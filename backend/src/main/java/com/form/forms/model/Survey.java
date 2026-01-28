package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.Map;

@Document(collection = "surveys")
public class Survey {
    @Id
    private String id;

    @Indexed
    private String organizationId; // Points to the Corporate Admin

    @Indexed
    private String projectId; // Link to Project

    @Indexed(unique = true)
    private String slug; // Friendly URL part

    private String title;
    private String description;

    private Map<String, Object> surveyJson;

    // Mapping of Long Question Name -> Short Key
    private Map<String, String> minifiedKeys;

    private SurveyStatus status = SurveyStatus.DRAFT;
    private Integer version = 1;

    private String createdBy; // ID of the Project Manager who created it
    private Date createdAt = new Date();
    private Date updatedAt;

    // RBAC: list of NGOs assigned to this survey
    private java.util.List<String> assignedNgoIds;

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, Object> getSurveyJson() {
        return surveyJson;
    }

    public void setSurveyJson(Map<String, Object> surveyJson) {
        this.surveyJson = surveyJson;
    }

    public Map<String, String> getMinifiedKeys() {
        return minifiedKeys;
    }

    public void setMinifiedKeys(Map<String, String> minifiedKeys) {
        this.minifiedKeys = minifiedKeys;
    }

    public SurveyStatus getStatus() {
        return status;
    }

    public void setStatus(SurveyStatus status) {
        this.status = status;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
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

    public java.util.List<String> getAssignedNgoIds() {
        return assignedNgoIds;
    }

    public void setAssignedNgoIds(java.util.List<String> assignedNgoIds) {
        this.assignedNgoIds = assignedNgoIds;
    }
}
