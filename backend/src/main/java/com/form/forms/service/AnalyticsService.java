package com.form.forms.service;

import com.form.forms.tenant.OrganizationContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private com.form.forms.repository.SurveyRepository surveyRepository;

    public List<Map> getQuestionCounts(String surveyId, String questionKey) {
        String organizationId = OrganizationContext.getOrganizationId();

        // 1. Resolve Key (Minified vs Original)
        com.form.forms.model.Survey survey = surveyRepository.findById(surveyId).orElse(null);
        String dbKey = questionKey;

        if (survey != null && survey.getMinifiedKeys() != null && survey.getMinifiedKeys().containsKey(questionKey)) {
            dbKey = survey.getMinifiedKeys().get(questionKey);
        }

        // Match specific survey and organization (Isolation)
        Criteria criteria = Criteria.where("surveyId").is(surveyId)
                .and("status").is(com.form.forms.model.ResponseStatus.COMPLETED); // Only count VALID completions

        if (organizationId != null) {
            criteria.and("organizationId").is(organizationId);
        }

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(criteria),
                Aggregation.group("answers." + dbKey).count().as("count"),
                Aggregation.project("count").and("_id").as("label"));

        AggregationResults<Map> results = mongoTemplate.aggregate(aggregation, "responses", Map.class);
        return results.getMappedResults();
    }

    public List<Map> getTimeSeriesStats(String surveyId) {
        String organizationId = OrganizationContext.getOrganizationId();

        Criteria criteria = Criteria.where("surveyId").is(surveyId)
                .and("status").is(com.form.forms.model.ResponseStatus.COMPLETED);

        if (organizationId != null) {
            criteria.and("organizationId").is(organizationId);
        }

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(criteria),
                // Project date to format only YYYY-MM or YYYY-MM-DD
                Aggregation.project()
                        .andExpression("dateToString('%Y-%m-%d', submittedAt)").as("date"),
                Aggregation.group("date").count().as("count"),
                Aggregation.project("count").and("_id").as("date"),
                Aggregation.sort(org.springframework.data.domain.Sort.Direction.ASC, "date"));

        AggregationResults<Map> results = mongoTemplate.aggregate(aggregation, "responses", Map.class);
        return results.getMappedResults();
    }
}
