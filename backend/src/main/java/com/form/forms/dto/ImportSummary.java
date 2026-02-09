package com.form.forms.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class ImportSummary {
    private int successCount;
    private int failedCount;
    private int duplicateCount;
    private int emptyCount;
    private int totalRows;
    private List<String> errors = new ArrayList<>();

    public void addError(String error) {
        this.errors.add(error);
    }

    public void incrementSuccess() {
        this.successCount++;
    }

    public void incrementFailed() {
        this.failedCount++;
    }

    public void incrementDuplicate() {
        this.duplicateCount++;
    }

    public void incrementEmpty() {
        this.emptyCount++;
    }

    public void addSuccess(int count) {
        this.successCount += count;
    }

    public void addFailed(int count) {
        this.failedCount += count;
    }

    // Manual getters for serialization safety
    public int getSuccessCount() {
        return successCount;
    }

    public int getFailedCount() {
        return failedCount;
    }

    public int getDuplicateCount() {
        return duplicateCount;
    }

    public int getEmptyCount() {
        return emptyCount;
    }

    public List<String> getErrors() {
        return errors;
    }

    // Manual setters/getters to ensure compilation
    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getTotalRows() {
        return totalRows;
    }
}
