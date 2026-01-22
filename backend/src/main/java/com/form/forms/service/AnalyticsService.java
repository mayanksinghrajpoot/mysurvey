package com.form.forms.service;

import com.form.forms.tenant.TenantContext;
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

    public List<Map> getQuestionCounts(String surveyId, String questionKey) {
        String tenantId = TenantContext.getTenantId();

        // Match specific survey and tenant (Isolation)
        // Match specific survey and tenant (Isolation)
        Criteria criteria = Criteria.where("surveyId").is(surveyId)
                .and("status").is(com.form.forms.model.ResponseStatus.COMPLETED); // Only count VALID completions

        if (tenantId != null) {
            criteria.and("tenantId").is(tenantId);
        }

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(criteria),
                // Group by the answer value for the specific question
                // "answers" is the Map, so we access dot notation: answers.questionKey
                Aggregation.group("answers." + questionKey).count().as("count"),
                Aggregation.project("count").and("_id").as("label"));

        AggregationResults<Map> results = mongoTemplate.aggregate(aggregation, "responses", Map.class);
        return results.getMappedResults();
    }

    public List<Map> getTimeSeriesStats(String surveyId) {
        String tenantId = TenantContext.getTenantId();

        Criteria criteria = Criteria.where("surveyId").is(surveyId)
                .and("status").is(com.form.forms.model.ResponseStatus.COMPLETED);

        if (tenantId != null) {
            criteria.and("tenantId").is(tenantId);
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
