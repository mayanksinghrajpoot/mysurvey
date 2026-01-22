package com.form.forms.controller;

import com.form.forms.model.Survey;
import com.form.forms.model.SurveyResponse;
import com.form.forms.service.SurveyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/surveys")
public class SurveyController {

    private final SurveyService surveyService;

    public SurveyController(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    @PostMapping
    public ResponseEntity<Survey> createSurvey(@RequestBody Survey survey) {
        return ResponseEntity.ok(surveyService.createSurvey(survey));
    }

    @GetMapping
    public ResponseEntity<List<Survey>> getAllSurveys() {
        return ResponseEntity.ok(surveyService.getAllSurveys());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Survey> getSurvey(@PathVariable String id) {
        return ResponseEntity.ok(surveyService.getSurvey(id));
    }

    // Public endpoint for Survey Runner (NO AUTH REQUIRED usually, handled by
    // SecurityConfig)
    @GetMapping("/public/{id}")
    public ResponseEntity<Survey> getSurveyPublic(@PathVariable String id) {
        return ResponseEntity.ok(surveyService.getSurveyForRunner(id));
    }

    // Public submission endpoint
    @PostMapping("/submit/{id}")
    public ResponseEntity<SurveyResponse> submitResponse(@PathVariable String id,
            @RequestBody Map<String, Object> payload) {
        // payload expects { "answers": { ... } } or just map of answers?
        // Let's assume the body IS the answers map for simplicity, or wrapped.
        // Based on SurveyJS, sender.data is a JSON object.
        return ResponseEntity.ok(surveyService.submitResponse(id, payload));
    }

    @GetMapping("/{id}/responses")
    public ResponseEntity<List<SurveyResponse>> getResponses(@PathVariable String id) {
        return ResponseEntity.ok(surveyService.getSurveyResponses(id));
    }
}
