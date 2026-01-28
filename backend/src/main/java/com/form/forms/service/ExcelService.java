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

    public ExcelService(SurveyRepository surveyRepository, SurveyResponseRepository responseRepository,
            SchemaValidator schemaValidator) {
        this.surveyRepository = surveyRepository;
        this.responseRepository = responseRepository;
        this.schemaValidator = schemaValidator;
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

        List<SurveyResponse> responses = responseRepository.findBySurveyId(surveyId);

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
            Map<Integer, String> columnMapping = new HashMap<>();

            // Build map of Title/Name -> Key for matching
            Map<String, String> schemaMap = buildTitleToNameMap(survey);

            for (Cell cell : headerRow) {
                String header = cell.getStringCellValue().trim();
                String matchedKey = schemaMap.get(header.toLowerCase());
                if (matchedKey != null) {
                    columnMapping.put(cell.getColumnIndex(), matchedKey);
                }
            }

            if (columnMapping.isEmpty()) {
                summary.addError("No matching columns found. Please ensure headers match question names or titles.");
                return summary;
            }

            // 2. Iterate Data Rows
            int rowNum = 1;
            while (rows.hasNext()) {
                rowNum++;
                Row currentRow = rows.next();
                try {
                    Map<String, Object> answers = new HashMap<>();
                    boolean hasData = false;

                    for (Map.Entry<Integer, String> entry : columnMapping.entrySet()) {
                        Cell cell = currentRow.getCell(entry.getKey());
                        Object value = getCellValue(cell);

                        if (value != null) {
                            answers.put(entry.getValue(), value);
                            hasData = true;
                        }
                    }

                    if (hasData) {
                        // Validate before creating response
                        List<String> validationErrors = schemaValidator.validate(survey, answers);
                        if (!validationErrors.isEmpty()) {
                            throw new RuntimeException("Validation failed: " + String.join(", ", validationErrors));
                        }

                        SurveyResponse response = new SurveyResponse();
                        response.setSurveyId(surveyId);
                        response.setOrganizationId(organizationId); // Set Org ID
                        response.setSurveyVersion(survey.getVersion());
                        response.setStatus(ResponseStatus.COMPLETED);
                        response.setAnswers(answers);
                        response.setSubmittedAt(new Date());

                        Map<String, Object> meta = new HashMap<>();
                        meta.put("importSource", "Excel Upload");
                        meta.put("importedBy", organizationId);
                        response.setMetadata(meta);

                        responsesToSave.add(response);
                        summary.incrementSuccess();
                    }
                } catch (Exception e) {
                    summary.incrementFailed();
                    summary.addError("Row " + rowNum + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            summary.addError("Critical Error processing file: " + e.getMessage());
            return summary;
        }

        if (!responsesToSave.isEmpty()) {
            responseRepository.saveAll(responsesToSave);
        }

        return summary;
    }

    private Object getCellValue(Cell cell) {
        if (cell == null)
            return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell))
                    return cell.getDateCellValue().toString();
                double val = cell.getNumericCellValue();
                if (val == (long) val)
                    return String.valueOf((long) val); // Return as string integer if whole
                return val; // Return Double otherwise
            case BOOLEAN:
                return cell.getBooleanCellValue();
            default:
                return null;
        }
    }

    private Map<String, String> buildTitleToNameMap(Survey survey) {
        Map<String, String> map = new HashMap<>();
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

                    map.put(name.toLowerCase(), name);
                    if (title != null)
                        map.put(title.toLowerCase(), name);
                }
            }
        }
        return map;
    }
}
