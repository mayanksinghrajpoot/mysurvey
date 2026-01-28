package com.form.forms.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.Map;

@Document(collection = "responses")
@CompoundIndexes({
        @CompoundIndex(name = "org_survey_idx", def = "{'organizationId' : 1, 'surveyId' : 1, 'submittedAt' : -1}"),
        @CompoundIndex(name = "answers_wildcard_idx", def = "{'answers.$**' : 1}")
})
public class SurveyResponse {
    @Id
    private String id;
    private String organizationId; // Renamed from tenantId
    private String surveyId;
    private Integer surveyVersion;

    // Who submitted this response (usually an NGO)
    private String respondentId;

    // Default to COMPLETED for now
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

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
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

    public String getRespondentId() {
        return respondentId;
    }

    public void setRespondentId(String respondentId) {
        this.respondentId = respondentId;
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
