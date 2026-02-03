package com.form.forms.controller;

import com.form.forms.dto.ImportSummary;
import com.form.forms.model.Survey;
import com.form.forms.model.SurveyResponse;
import com.form.forms.service.ExcelService;
import com.form.forms.service.SurveyService;
import com.form.forms.exception.BadRequestException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/surveys")
public class SurveyController {

    private final SurveyService surveyService;
    private final ExcelService excelService;

    public SurveyController(SurveyService surveyService, ExcelService excelService) {
        this.surveyService = surveyService;
        this.excelService = excelService;
    }

    @PostMapping
    public ResponseEntity<Survey> createSurvey(@RequestBody Survey survey) {
        return ResponseEntity.ok(surveyService.createSurvey(survey));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Survey> updateSurvey(@PathVariable String id, @RequestBody Survey survey) {
        return ResponseEntity.ok(surveyService.updateSurvey(id, survey));
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
        return ResponseEntity.ok(surveyService.submitResponse(id, payload));
    }

    @GetMapping("/{id}/responses")
    public ResponseEntity<List<SurveyResponse>> getResponses(
            @PathVariable String id,
            @RequestParam(required = false) String questionKey,
            @RequestParam(required = false) String answerValue) {
        return ResponseEntity.ok(surveyService.getFilteredResponses(id, questionKey, answerValue));
    }

    @PostMapping("/{id}/import")
    public ResponseEntity<?> importResponses(@PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        try {
            ImportSummary summary = excelService.importResponses(id, file);
            return ResponseEntity.ok(summary);
        } catch (IOException e) {
            throw new BadRequestException("Failed to process file: " + e.getMessage(), e);
        }
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<InputStreamResource> exportResponses(@PathVariable String id) {
        try {
            ByteArrayInputStream in = excelService.exportToExcel(id);
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=responses.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new InputStreamResource(in));
        } catch (IOException e) {
            throw new RuntimeException("Failed to export data", e);
        }
    }
}
