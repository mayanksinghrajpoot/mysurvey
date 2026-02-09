package com.form.forms.service;

import com.form.forms.dto.ImportSummary;
import com.form.forms.model.ResponseStatus;
import com.form.forms.model.Survey;
import com.form.forms.model.SurveyResponse;
import com.form.forms.repository.SurveyRepository;
import com.form.forms.repository.SurveyResponseRepository;
import com.form.forms.tenant.OrganizationContext;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@Service
public class ExcelService {

    private final SurveyRepository surveyRepository;
    private final SurveyResponseRepository responseRepository;
    private final SchemaValidator schemaValidator;
    private final AnalyticsService analyticsService;
    private final com.form.forms.repository.UserRepository userRepository;

    public ExcelService(SurveyRepository surveyRepository, SurveyResponseRepository responseRepository,
            SchemaValidator schemaValidator, AnalyticsService analyticsService,
            com.form.forms.repository.UserRepository userRepository) {
        this.surveyRepository = surveyRepository;
        this.responseRepository = responseRepository;
        this.schemaValidator = schemaValidator;
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
    }

    // ==================================================================================
    // EXPORT
    // ==================================================================================
    public ByteArrayInputStream exportToExcel(String surveyId) throws IOException {
        Survey survey = surveyRepository.findById(surveyId)
                .orElseThrow(() -> new RuntimeException("Survey not found"));

        // Fetch responses
        String organizationId = OrganizationContext.getOrganizationId();
        // Permission check: Should ensure user has access to survey first.
        if (organizationId != null && !survey.getOrganizationId().equals(organizationId)) {
            throw new RuntimeException("Access Denied");
        }

        // --- SECURITY ENHANCEMENT: Filter NGO Exports ---
        List<SurveyResponse> responses;
        com.form.forms.model.Role role = getCurrentUserRole();
        if (role == com.form.forms.model.Role.NGO) {
            String userId = getCurrentUserId();
            if (userId != null) {
                // Fetch filtered responses for NGO
                // Using MongoTemplate or custom repository method would be cleaner,
                // but here we can just filter in memory or fetch all and filter
                // (Repository method preferred for performance)
                // Let's assume responseRepository finds by surveyId and respondentId
                // Or use stream filter here if list is small.
                // Better: responses =
                // responseRepository.findBySurveyIdAndRespondentId(surveyId, userId);
                // I will add this method to repository or modify logic.
                // Checking if method exists first?
                // Let's use stream since findBySurveyIdAndRespondentId might not exist yet.
                // Actually, let's just use stream filter for now, safe and simple.
                List<SurveyResponse> allResponses = responseRepository.findBySurveyId(surveyId);
                responses = allResponses.stream()
                        .filter(r -> userId.equals(r.getRespondentId()))
                        .collect(java.util.stream.Collectors.toList());
            } else {
                responses = new ArrayList<>();
            }
        } else {
            // Project Managers and Admins see all for the survey (within Org scope enforced
            // by repo/context)
            responses = responseRepository.findBySurveyId(surveyId);
        }

        try (Workbook workbook = new SXSSFWorkbook(100)) { // Keep 100 rows in memory, rest on disk
            Sheet sheet = workbook.createSheet("Responses");

            // 1. Build Headers from Survey Definition
            List<String> questions = getQuestionNames(survey);

            Row headerRow = sheet.createRow(0);
            int colIdx = 0;
            headerRow.createCell(colIdx++).setCellValue("Response ID");
            headerRow.createCell(colIdx++).setCellValue("Submitted At");

            for (String q : questions) {
                headerRow.createCell(colIdx++).setCellValue(q);
            }

            // 2. Populate Data
            int rowIdx = 1;
            for (SurveyResponse response : responses) {
                Row row = sheet.createRow(rowIdx++);
                int cellIdx = 0;

                // Metadata
                row.createCell(cellIdx++).setCellValue(response.getId());
                row.createCell(cellIdx++)
                        .setCellValue(response.getSubmittedAt() != null ? response.getSubmittedAt().toString() : "");

                // Answers
                Map<String, Object> answers = response.getAnswers();
                if (answers != null) {
                    for (String q : questions) {
                        Cell cell = row.createCell(cellIdx++);
                        Object validAns = answers.get(q);

                        if (validAns == null && answers.containsKey("answers")
                                && answers.get("answers") instanceof Map) {
                            validAns = ((Map<?, ?>) answers.get("answers")).get(q);
                        }

                        setCellValue(cell, validAns);
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    // Helper methods for Security Context (Adding these to ExcelService)
    public com.form.forms.model.Role getCurrentUserRole() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            String roleName = auth.getAuthorities().stream()
                    .findFirst()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .orElse(null);
            if (roleName != null) {
                try {
                    return com.form.forms.model.Role.valueOf(roleName);
                } catch (IllegalArgumentException e) {
                    return null;
                }
            }
        }
        return null;
    }

    public String getCurrentUserId() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return userRepository.findByUsername(auth.getName())
                    .map(com.form.forms.model.User::getId)
                    .orElse(null);
        }
        return null;
    }

    private void setCellValue(Cell cell, Object value) {
        if (value == null) {
            cell.setCellValue("");
        } else if (value instanceof Number) {
            cell.setCellValue(((Number) value).doubleValue());
        } else if (value instanceof Boolean) {
            cell.setCellValue((Boolean) value);
        } else if (value instanceof List) {
            // Provide comma separated string for arrays
            cell.setCellValue(String.join(", ", ((List<?>) value).stream().map(Object::toString).toList()));
        } else {
            cell.setCellValue(value.toString());
        }
    }

    private List<String> getQuestionNames(Survey survey) {
        List<String> names = new ArrayList<>();
        Map<String, Object> json = survey.getSurveyJson();
        if (json == null || !json.containsKey("pages"))
            return names;

        List<Map<String, Object>> pages = (List<Map<String, Object>>) json.get("pages");
        for (Map<String, Object> page : pages) {
            List<Map<String, Object>> elements = (List<Map<String, Object>>) page.get("elements");
            if (elements != null) {
                for (Map<String, Object> el : elements) {
                    names.add((String) el.get("name"));
                }
            }
        }
        return names;
    }

    // ==================================================================================
    // IMPORT
    // ==================================================================================
    public ImportSummary importResponses(String surveyId, MultipartFile file) throws IOException {
        Survey survey = surveyRepository.findById(surveyId)
                .orElseThrow(() -> new RuntimeException("Survey not found"));

        String organizationId = OrganizationContext.getOrganizationId();
        if (organizationId != null && !survey.getOrganizationId().equals(organizationId)) {
            throw new RuntimeException("Access Denied");
        }

        ImportSummary summary = new ImportSummary();
        List<SurveyResponse> responsesToSave = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            // 1. Parse Headers
            if (!rows.hasNext()) {
                summary.addError("File is empty");
                return summary;
            }
            Row headerRow = rows.next();
            Map<Integer, QuestionMeta> columnMapping = new HashMap<>();

            // Build map of Title/Name -> Meta for matching
            Map<String, QuestionMeta> schemaMap = buildQuestionMetaMap(survey);

            for (Cell cell : headerRow) {
                String header = cell.getStringCellValue().trim();
                // Check direct match or lowercase match
                QuestionMeta matchedMeta = schemaMap.get(header.toLowerCase());
                if (matchedMeta != null) {
                    columnMapping.put(cell.getColumnIndex(), matchedMeta);
                }
            }

            if (columnMapping.isEmpty()) {
                String error = "No matching columns found. Please ensure headers match question names or titles.";
                System.out.println("Import Error: " + error);
                summary.addError(error);
                return summary;
            }

            System.out.println("Found matching columns: " + columnMapping.size());

            // 2. Iterate Data Rows
            int rowNum = 1;

            // Fetch existing hashes to prevent duplicates
            Set<Integer> existingHashes = responseRepository.findBySurveyId(surveyId).stream()
                    .map(SurveyResponse::getResponseHash)
                    .filter(Objects::nonNull)
                    .collect(java.util.stream.Collectors.toSet());

            System.out.println("DEBUG: Found " + existingHashes.size() + " existing response hashes.");

            while (rows.hasNext()) {
                rowNum++;
                Row currentRow = rows.next();
                summary.setTotalRows(rowNum - 1); // Track total rows found so far

                try {
                    Map<String, Object> answers = new HashMap<>();
                    boolean hasData = false;

                    for (Map.Entry<Integer, QuestionMeta> entry : columnMapping.entrySet()) {
                        Cell cell = currentRow.getCell(entry.getKey());
                        Object value = getCellValue(cell);

                        // Coerce Value
                        QuestionMeta meta = entry.getValue();
                        value = coerceValue(value, meta.type, meta.inputType);

                        if (value != null) {
                            answers.put(meta.name, value);
                            hasData = true;
                        }
                    }

                    if (hasData) {
                        // Deduplication Logic
                        int responseHash = answers.hashCode();
                        if (existingHashes.contains(responseHash)) {
                            System.out.println("Skipping duplicate row " + rowNum);
                            summary.incrementDuplicate(); // Track duplicate
                            continue;
                        }

                        // Validate before creating response
                        // SKIP VALIDATION for Excel Import as per requirement:
                        // "search if header name is matching it should not see the type (not
                        // restricted)"
                        /*
                         * List<String> validationErrors = schemaValidator.validate(survey, answers);
                         * if (!validationErrors.isEmpty()) {
                         * throw new RuntimeException("Validation failed: " + String.join(", ",
                         * validationErrors));
                         * }
                         */

                        SurveyResponse response = new SurveyResponse();
                        response.setSurveyId(surveyId);
                        response.setOrganizationId(organizationId); // Set Org ID
                        response.setSurveyVersion(survey.getVersion());
                        response.setStatus(ResponseStatus.COMPLETED);
                        response.setAnswers(answers);
                        response.setSubmittedAt(new Date());
                        response.setResponseHash(responseHash); // Save hash for future checks

                        Map<String, Object> meta = new HashMap<>();
                        meta.put("importSource", "Excel Upload");
                        meta.put("importedBy", organizationId);
                        response.setMetadata(meta);

                        responsesToSave.add(response);
                        // Do NOT increment success here. Success is counted only after DB save.
                        existingHashes.add(responseHash); // Add to local set to catch duplicates within the file itself
                    } else {
                        System.out.println("Row " + rowNum + " skipped: No data found in mapped columns.");
                        summary.incrementEmpty(); // Track empty row
                    }
                } catch (Exception e) {
                    System.err.println("Row " + rowNum + " failed: " + e.getMessage());
                    summary.incrementFailed();
                    summary.addError("Row " + rowNum + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            e.printStackTrace(); // DEBUG: Print full trace to console
            summary.addError("Critical Error processing file: " + e.getMessage());
            return summary;
        }

        if (!responsesToSave.isEmpty()) {
            try {
                // Save in batches to avoid memory spikes
                int batchSize = 500;
                for (int i = 0; i < responsesToSave.size(); i += batchSize) {
                    int end = Math.min(i + batchSize, responsesToSave.size());
                    List<SurveyResponse> batch = responsesToSave.subList(i, end);
                    try {
                        List<SurveyResponse> savedBatch = responseRepository.saveAll(batch);
                        summary.addSuccess(savedBatch.size());

                        // Update Analytics for Imported Data
                        for (SurveyResponse saved : savedBatch) {
                            analyticsService.logResponse(saved);
                        }

                    } catch (Exception e) {
                        // If a batch fails, mark them as failed
                        System.err.println("Error saving batch: " + e.getMessage());
                        summary.addFailed(batch.size());
                        summary.addError("Database Error saving batch of " + batch.size() + " rows: " + e.getMessage());
                    }
                }
            } catch (Exception e) {
                // Should be caught by inner loop, but just in case
                System.err.println("Error in batch processing: " + e.getMessage());
                e.printStackTrace();
                summary.addError("Critical Database Error: " + e.getMessage());
            }
        }

        return summary;
    }

    private Object getCellValue(Cell cell) {
        if (cell == null)
            return null;
        DataFormatter formatter = new DataFormatter();
        String value = formatter.formatCellValue(cell);
        return (value == null || value.trim().isEmpty()) ? null : value.trim();
    }

    private Object coerceValue(Object value, String type, String inputType) {
        if (value == null)
            return null;
        String strVal = value.toString().trim();
        if (strVal.isEmpty())
            return null;

        // Numeric Coercion
        if ("number".equalsIgnoreCase(type) || "text".equalsIgnoreCase(type) && "number".equalsIgnoreCase(inputType)) {
            try {
                // Handle currency symbols or commas if present? For now simple parsing.
                return Double.parseDouble(strVal.replace(",", ""));
            } catch (NumberFormatException e) {
                // If it fails, return original string and let validator complain
                return strVal;
            }
        }

        // Boolean Coercion
        if ("boolean".equalsIgnoreCase(type)) {
            if ("yes".equalsIgnoreCase(strVal) || "true".equalsIgnoreCase(strVal) || "1".equals(strVal))
                return true;
            if ("no".equalsIgnoreCase(strVal) || "false".equalsIgnoreCase(strVal) || "0".equals(strVal))
                return false;
            return strVal;
        }

        return strVal;
    }

    private Map<String, QuestionMeta> buildQuestionMetaMap(Survey survey) {
        Map<String, QuestionMeta> map = new HashMap<>();
        Map<String, Object> json = survey.getSurveyJson();
        if (json == null || !json.containsKey("pages"))
            return map;

        List<Map<String, Object>> pages = (List<Map<String, Object>>) json.get("pages");
        for (Map<String, Object> page : pages) {
            List<Map<String, Object>> elements = (List<Map<String, Object>>) page.get("elements");
            if (elements != null) {
                for (Map<String, Object> el : elements) {
                    String name = (String) el.get("name");
                    String title = (String) el.get("title");
                    String type = (String) el.get("type");
                    String inputType = (String) el.get("inputType");

                    QuestionMeta meta = new QuestionMeta(name, type, inputType);

                    // Map by name (lowercase)
                    map.put(name.toLowerCase(), meta);

                    // Map by title (lowercase) if present
                    if (title != null)
                        map.put(title.toLowerCase(), meta);
                }
            }
        }
        return map;
    }

    private static class QuestionMeta {
        String name;
        String type;
        String inputType;

        public QuestionMeta(String name, String type, String inputType) {
            this.name = name;
            this.type = type;
            this.inputType = inputType;
        }
    }
}
