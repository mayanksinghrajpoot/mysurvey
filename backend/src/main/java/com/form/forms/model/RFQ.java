package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.List;

@Document(collection = "rfqs")
@CompoundIndexes({
        @CompoundIndex(name = "ngo_project_idx", def = "{'projectId': 1, 'ngoId': 1}", unique = true)
})
public class RFQ {
    @Id
    private String id;

    @org.springframework.data.annotation.Version
    private Long version;

    private String projectId;
    private String ngoId;

    private String title;
    private String details;
    private Double totalBudget;

    // V2: Multi-Year Contract Breakdown
    private List<BudgetBreakdown> budgetBreakdown;

    public static class BudgetBreakdown {
        private String financialYear; // e.g. "2024-25"
        private Double amount;

        // Constructors, Getters, Setters
        public BudgetBreakdown() {
        }

        public BudgetBreakdown(String financialYear, Double amount) {
            this.financialYear = financialYear;
            this.amount = amount;
        }

        public String getFinancialYear() {
            return financialYear;
        }

        public void setFinancialYear(String financialYear) {
            this.financialYear = financialYear;
        }

        public Double getAmount() {
            return amount;
        }

        public void setAmount(Double amount) {
            this.amount = amount;
        }
    }

    // V3: Custom Expense Format (Dynamic Fields)
    private List<CustomField> expenseFormat;

    public static class CustomField {
        private String name; // Field Label
        private String type; // text, number, date, file
        private boolean required;

        public CustomField() {
        }

        public CustomField(String name, String type, boolean required) {
            this.name = name;
            this.type = type;
            this.required = required;
        }

        // Getters/Setters
        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public boolean isRequired() {
            return required;
        }

        public void setRequired(boolean required) {
            this.required = required;
        }
    }

    private RFQStatus status = RFQStatus.PENDING_PM;

    private Date createdAt = new Date();
    private Date updatedAt;

    private Date pmApprovalDate;
    private Date adminApprovalDate;
    private String rejectionReason;

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
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

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Double getTotalBudget() {
        return totalBudget;
    }

    public void setTotalBudget(Double totalBudget) {
        this.totalBudget = totalBudget;
    }

    public RFQStatus getStatus() {
        return status;
    }

    public void setStatus(RFQStatus status) {
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

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public List<BudgetBreakdown> getBudgetBreakdown() {
        return budgetBreakdown;
    }

    public void setBudgetBreakdown(List<BudgetBreakdown> budgetBreakdown) {
        this.budgetBreakdown = budgetBreakdown;
    }

    public List<CustomField> getExpenseFormat() {
        return expenseFormat;
    }

    public void setExpenseFormat(List<CustomField> expenseFormat) {
        this.expenseFormat = expenseFormat;
    }
}
