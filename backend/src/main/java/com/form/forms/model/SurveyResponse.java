package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.Map;

@Document(collection = "responses")
@CompoundIndexes({
        @CompoundIndex(name = "tenant_survey_idx", def = "{'tenantId' : 1, 'surveyId' : 1, 'submittedAt' : -1}")
})
public class SurveyResponse {
    @Id
    private String id;
    private String tenantId;
    private String surveyId;
    private Integer surveyVersion;

    // Default to COMPLETED for now, but good to have the enum field
    private com.form.forms.model.ResponseStatus status = com.form.forms.model.ResponseStatus.COMPLETED;

    private Map<String, Object> answers;
    private Map<String, Object> metadata;

    private Date submittedAt = new Date();

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

    public String getSurveyId() {
        return surveyId;
    }

    public void setSurveyId(String surveyId) {
        this.surveyId = surveyId;
    }

    public Integer getSurveyVersion() {
        return surveyVersion;
    }

    public void setSurveyVersion(Integer surveyVersion) {
        this.surveyVersion = surveyVersion;
    }

    public com.form.forms.model.ResponseStatus getStatus() {
        return status;
    }

    public void setStatus(com.form.forms.model.ResponseStatus status) {
        this.status = status;
    }

    public Map<String, Object> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<String, Object> answers) {
        this.answers = answers;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public Date getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Date submittedAt) {
        this.submittedAt = submittedAt;
    }
}
