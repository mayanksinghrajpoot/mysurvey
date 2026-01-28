package com.form.forms.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class ImportSummary {
    private int successCount;
    private int failedCount;
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
}
