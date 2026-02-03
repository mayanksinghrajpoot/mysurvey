package com.form.forms.model;

import lombok.Data; // Keeping annotation just in case, but adding methods manually
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashMap;
import java.util.Map;

@Data
@Document(collection = "survey_daily_stats")
@CompoundIndex(name = "survey_date_idx", def = "{'surveyId': 1, 'date': 1}", unique = true)
public class SurveyDailyStats {

    @Id
    private String id;

    private String surveyId;
    private String organizationId;

    // Format: YYYY-MM-DD
    private String date;

    private int totalResponses = 0;

    // Structure: Map<QuestionKey, Map<OptionKey, Count>>
    // Example: "q1" -> { "Yes": 10, "No": 5 }
    private Map<String, Map<String, Integer>> questionStats = new HashMap<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSurveyId() {
        return surveyId;
    }

    public void setSurveyId(String surveyId) {
        this.surveyId = surveyId;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public int getTotalResponses() {
        return totalResponses;
    }

    public void setTotalResponses(int totalResponses) {
        this.totalResponses = totalResponses;
    }

    public Map<String, Map<String, Integer>> getQuestionStats() {
        return questionStats;
    }

    public void setQuestionStats(Map<String, Map<String, Integer>> questionStats) {
        this.questionStats = questionStats;
    }
}
