package com.form.forms.controller;

import com.form.forms.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/{surveyId}/questions/{questionKey}")
    public ResponseEntity<List<Map<String, Object>>> getQuestionStats(
            @PathVariable String surveyId,
            @PathVariable String questionKey,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(analyticsService.getQuestionCounts(surveyId, questionKey, startDate, endDate));
    }

    @GetMapping("/{surveyId}/timeline")
    public ResponseEntity<List<Map<String, Object>>> getTimelineStats(
            @PathVariable String surveyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(analyticsService.getTimeSeriesStats(surveyId, startDate, endDate));
    }

    @PostMapping("/{surveyId}/backfill")
    public ResponseEntity<String> backfillAnalytics(@PathVariable String surveyId) {
        analyticsService.backfillSurvey(surveyId);
        return ResponseEntity.ok("Backfill started for survey: " + surveyId);
    }

    @GetMapping("/{surveyId}/questions/{questionKey}/metric")
    public ResponseEntity<Map<String, Object>> getMetric(
            @PathVariable String surveyId,
            @PathVariable String questionKey,
            @RequestParam String type,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(analyticsService.calculateMetric(surveyId, questionKey, type, startDate, endDate));
    }
}
