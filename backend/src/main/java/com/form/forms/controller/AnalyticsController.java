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
    public ResponseEntity<List<Map>> getQuestionStats(
            @PathVariable String surveyId,
            @PathVariable String questionKey) {
        return ResponseEntity.ok(analyticsService.getQuestionCounts(surveyId, questionKey));
    }

    @GetMapping("/{surveyId}/timeline")
    public ResponseEntity<List<Map>> getTimelineStats(@PathVariable String surveyId) {
        return ResponseEntity.ok(analyticsService.getTimeSeriesStats(surveyId));
    }
}
