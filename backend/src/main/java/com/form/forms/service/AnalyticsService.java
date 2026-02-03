package com.form.forms.service;

import com.form.forms.model.SurveyDailyStats;
import com.form.forms.model.SurveyResponse;
import com.form.forms.repository.SurveyDailyStatsRepository;
import com.form.forms.repository.SurveyResponseRepository;
import com.form.forms.repository.SurveyRepository;
import com.form.forms.tenant.OrganizationContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private SurveyDailyStatsRepository statsRepository;

    @Autowired
    private SurveyResponseRepository responseRepository;

    @Autowired
    private SurveyRepository surveyRepository;

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");

    /**
     * Incrementally updates daily stats for a new response.
     * Efficient Write-Time Aggregation.
     */
    public void logResponse(SurveyResponse response) {
        if (response.getStatus() != com.form.forms.model.ResponseStatus.COMPLETED) {
            return;
        }

        String dateStr = DATE_FORMAT.format(response.getSubmittedAt());
        String surveyId = response.getSurveyId();
        String orgId = response.getOrganizationId();

        Query query = new Query(Criteria.where("surveyId").is(surveyId).and("date").is(dateStr));
        Update update = new Update();

        update.setOnInsert("organizationId", orgId);
        update.inc("totalResponses", 1);

        if (response.getAnswers() != null) {
            for (Map.Entry<String, Object> entry : response.getAnswers().entrySet()) {
                String questionKey = entry.getKey();
                Object value = entry.getValue();

                incrementStatsForAnswer(update, questionKey, value);
            }
        }

        // Atomic Upsert
        mongoTemplate.upsert(query, update, SurveyDailyStats.class);
    }

    private void incrementStatsForAnswer(Update update, String key, Object value) {
        if (value == null)
            return;

        if (value instanceof List) {
            // Unwind Array (Checkbox, Tagbox)
            for (Object item : (List<?>) value) {
                String optionKey = sanitizeKey(item.toString());
                update.inc("questionStats." + key + "." + optionKey, 1);
            }
        } else {
            // Single Value (Radio, Dropdown, Boolean)
            String optionKey = sanitizeKey(value.toString());
            update.inc("questionStats." + key + "." + optionKey, 1);
        }
    }

    // MongoDB keys cannot contain '.' or '$'.
    // Ideally we usage safe keys, but for now we replace dots with underscores.
    private String sanitizeKey(String key) {
        return key.replace(".", "_").replace("$", "_");
    }

    /**
     * Efficient O(1) Read-Time Query (Aggregating pre-computed days).
     */
    public List<Map<String, Object>> getQuestionCounts(String surveyId, String questionKey, String startDate,
            String endDate) {
        // Resolve startDate/endDate defaults if null
        // Default: All time (or reasonably long period)

        List<SurveyDailyStats> statsList;
        if (startDate != null && endDate != null) {
            statsList = statsRepository.findBySurveyIdAndDateBetween(surveyId, startDate, endDate);
        } else {
            statsList = statsRepository.findBySurveyId(surveyId);
        }

        // Aggregate in Memory (Fast for < 3650 days i.e. 10 years)
        Map<String, Integer> aggregated = new HashMap<>();

        // Need to know if we are using minified keys lookup?
        // The dashboard asks for a Specific Question Key (e.g. "q1" if minified, or
        // "satisfaction" if not).
        // The stats store exactly what was in the response (likely minified "q1").
        // So we just look up `questionKey` directly in the map.

        for (SurveyDailyStats stats : statsList) {
            if (stats.getQuestionStats() != null && stats.getQuestionStats().containsKey(questionKey)) {
                Map<String, Integer> dailyMap = stats.getQuestionStats().get(questionKey);
                for (Map.Entry<String, Integer> entry : dailyMap.entrySet()) {
                    String key = entry.getKey();
                    if (key == null || key.trim().isEmpty()) {
                        continue;
                    }
                    aggregated.merge(key, entry.getValue(), Integer::sum);
                }
            }
        }

        // Convert to List<Map> for Frontend: [{ label: "Yes", count: 10 }]
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : aggregated.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            item.put("label", entry.getKey());
            item.put("count", entry.getValue());
            result.add(item);
        }

        return result;
    }

    public List<Map<String, Object>> getTimeSeriesStats(String surveyId, String startDate, String endDate) {
        List<SurveyDailyStats> statsList;
        if (startDate != null && endDate != null) {
            statsList = statsRepository.findBySurveyIdAndDateBetween(surveyId, startDate, endDate);
        } else {
            statsList = statsRepository.findBySurveyId(surveyId);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        // Sort by Date
        statsList.sort(Comparator.comparing(SurveyDailyStats::getDate));

        for (SurveyDailyStats stats : statsList) {
            Map<String, Object> item = new HashMap<>();
            item.put("date", stats.getDate());
            item.put("count", stats.getTotalResponses());
            result.add(item);
        }
        return result;
    }

    // Admin / Developer Utility
    public void backfillSurvey(String surveyId) {
        // Clear existing stats for this survey to avoid double counting?
        // Or assume IDempotency? logResponse is NOT idempotent (it increments).
        // Dangerous.
        // Strategy: Delete all stats for surveyId, then iterate responses.

        statsRepository.deleteAll(statsRepository.findBySurveyId(surveyId));

        List<SurveyResponse> responses = responseRepository.findBySurveyId(surveyId);
        for (SurveyResponse response : responses) {
            logResponse(response);
        }
    }

    /**
     * Calculates dynamic metrics (AVG, MIN, MAX, COUNT, UNIQUE) for a specific
     * question.
     * Uses MongoDB Aggregation on the raw SurveyResponse collection.
     */
    public Map<String, Object> calculateMetric(String surveyId, String questionKey, String metricType, String startDate,
            String endDate) {
        List<AggregationOperation> operations = new ArrayList<>();

        // 1. Match SurveyId
        // Relaxing status check: Allow COMPLETED or null (legacy imports might lack
        // status if verified manually)
        // But optimally we strictly want COMPLETED. If ExcelService sets it, we should
        // trust it.
        // However, user complained. Let's include everything for that SurveyID for now
        // to be safe,
        // or just ensure we don't filter out valid imports.
        // Criteria criteria = Criteria.where("surveyId").is(surveyId)
        // .and("status").is(com.form.forms.model.ResponseStatus.COMPLETED);

        Criteria criteria = Criteria.where("surveyId").is(surveyId);
        // We can optionally filter OUT 'IN_PROGRESS' if we have partial responses?
        // For now, simple ID match is safest for "imported data" visibility.

        // 2. Date Filter
        if (startDate != null && endDate != null) {
            try {
                Date start = DATE_FORMAT.parse(startDate);
                Date end = DATE_FORMAT.parse(endDate);
                criteria.and("submittedAt").gte(start).lte(end);
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }
        operations.add(Aggregation.match(criteria));

        // 3. Project & Convert Data Type
        String fieldPath = "answers." + questionKey;
        // Ensure field exists
        operations.add(Aggregation.match(Criteria.where(fieldPath).exists(true)));

        String convertedField = "convertedValue";
        boolean isNumericMetric = List.of("AVG", "MIN", "MAX", "SUM").contains(metricType.toUpperCase());

        if (isNumericMetric) {
            // Safe Convert to Double: Handles strings, numbers, and errors/nulls
            // $convert: { input: "$answers.key", to: "double", onError: 0, onNull: 0 }

            operations.add(Aggregation.project()
                    .and(org.springframework.data.mongodb.core.aggregation.ConvertOperators.Convert
                            .convertValue("$" + fieldPath)
                            .to(org.springframework.data.mongodb.core.schema.JsonSchemaObject.Type.doubleType())
                            .onErrorReturn(0)
                            .onNullReturn(0))
                    .as(convertedField));
        } else {
            // Check if we need to project for UNIQUE (could be string)
            operations.add(Aggregation.project().and(fieldPath).as(convertedField));
        }

        // 4. Group / Aggregate based on Metric Type
        String projectField = "result";
        switch (metricType.toUpperCase()) {
            case "AVG":
                operations.add(Aggregation.group().avg(convertedField).as(projectField));
                break;
            case "MIN":
                operations.add(Aggregation.group().min(convertedField).as(projectField));
                break;
            case "MAX":
                operations.add(Aggregation.group().max(convertedField).as(projectField));
                break;
            case "COUNT":
                operations.add(Aggregation.count().as(projectField));
                break;
            case "UNIQUE":
                // Group by the value itself to get distincts
                operations.add(Aggregation.group(convertedField));
                // Then count the groups
                operations.add(Aggregation.count().as(projectField));
                break;
            default:
                throw new IllegalArgumentException("Unknown metric type: " + metricType);
        }

        // Execute
        Aggregation aggregation = Aggregation.newAggregation(operations);
        AggregationResults<Map> results = mongoTemplate.aggregate(aggregation, "surveyResponse", Map.class);
        Map uniqueResult = results.getUniqueMappedResult();

        Map<String, Object> response = new HashMap<>();
        response.put("type", metricType);
        response.put("value", uniqueResult != null ? uniqueResult.get(projectField) : 0);

        return response;
    }
}
