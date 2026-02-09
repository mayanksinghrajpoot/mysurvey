package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.util.Date;

@Document(collection = "utilizations")
public class Utilization {
    @Id
    private String id;

    @Indexed
    private String rfpId; // Link to the specific Milestone Release

    @Indexed
    private String ngoId;

    private String title; // Expense Description
    private Double amount;
    private String proofUrl; // Optional link to image/doc

    private String status = "SUBMITTED"; // SUBMITTED, VERIFIED, REJECTED

    private Date createdAt = new Date();
    private Date verifiedAt;

    // Dynamic Data based on RFQ Custom Fields
    private java.util.Map<String, Object> customData;

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRfpId() {
        return rfpId;
    }

    public void setRfpId(String rfpId) {
        this.rfpId = rfpId;
    }

    public String getNgoId() {
        return ngoId;
    }

    public void setNgoId(String ngoId) {
        this.ngoId = ngoId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getProofUrl() {
        return proofUrl;
    }

    public void setProofUrl(String proofUrl) {
        this.proofUrl = proofUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(Date verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public java.util.Map<String, Object> getCustomData() {
        return customData;
    }

    public void setCustomData(java.util.Map<String, Object> customData) {
        this.customData = customData;
    }
}
