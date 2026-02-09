package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.util.Date;

@Document(collection = "rfps")
public class RFP {
    @Id
    private String id;

    @org.springframework.data.annotation.Version
    private Long version;

    @Indexed
    private String rfqId;

    private String ngoId;

    private String title;
    private Double amount;

    // Dynamic Form Data
    private java.util.Map<String, Object> customData;

    private RFPStatus status = RFPStatus.PENDING_PM;

    private Date createdAt = new Date();

    // Approval Tracking
    private Date pmApprovalDate;
    private Date adminApprovalDate;
    private Date decisionDate; // Final decision date
    private String rejectionReason;

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRfqId() {
        return rfqId;
    }

    public void setRfqId(String rfqId) {
        this.rfqId = rfqId;
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

    public RFPStatus getStatus() {
        return status;
    }

    public void setStatus(RFPStatus status) {
        this.status = status;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getPmApprovalDate() {
        return pmApprovalDate;
    }

    public void setPmApprovalDate(Date pmApprovalDate) {
        this.pmApprovalDate = pmApprovalDate;
    }

    public Date getAdminApprovalDate() {
        return adminApprovalDate;
    }

    public void setAdminApprovalDate(Date adminApprovalDate) {
        this.adminApprovalDate = adminApprovalDate;
    }

    public Date getDecisionDate() {
        return decisionDate;
    }

    public void setDecisionDate(Date decisionDate) {
        this.decisionDate = decisionDate;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public java.util.Map<String, Object> getCustomData() {
        return customData;
    }

    public void setCustomData(java.util.Map<String, Object> customData) {
        this.customData = customData;
    }
}
