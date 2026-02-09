package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Document(collection = "request_schemas")
public class RequestSchema {
    @Id
    private String id;
    private String tenantId;
    private SchemaType type; // RFQ or RFP
    private String schemaJson; // SurveyJS JSON string
    private Date createdAt;
    private Date updatedAt;

    public enum SchemaType {
        RFQ, RFP
    }

    public RequestSchema() {
    }

    public RequestSchema(String tenantId, SchemaType type, String schemaJson) {
        this.tenantId = tenantId;
        this.type = type;
        this.schemaJson = schemaJson;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public SchemaType getType() {
        return type;
    }

    public void setType(SchemaType type) {
        this.type = type;
    }

    public String getSchemaJson() {
        return schemaJson;
    }

    public void setSchemaJson(String schemaJson) {
        this.schemaJson = schemaJson;
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
