package com.form.forms.service;

import com.form.forms.model.Survey;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SchemaValidator {

    public List<String> validate(Survey survey, Map<String, Object> answers) {
        List<String> errors = new ArrayList<>();
        Map<String, Object> surveyJson = survey.getSurveyJson();

        if (surveyJson == null || !surveyJson.containsKey("pages")) {
            return errors;
        }

        List<Map<String, Object>> pages = (List<Map<String, Object>>) surveyJson.get("pages");
        for (Map<String, Object> page : pages) {
            List<Map<String, Object>> elements = (List<Map<String, Object>>) page.get("elements");
            if (elements != null) {
                for (Map<String, Object> element : elements) {
                    validateElement(element, answers, errors);
                }
            }
        }
        return errors;
    }

    private void validateElement(Map<String, Object> element, Map<String, Object> answers, List<String> errors) {
        String name = (String) element.get("name");
        String title = (String) element.get("title");
        String displayName = title != null ? title : name;

        boolean isRequired = Boolean.TRUE.equals(element.get("isRequired"));
        Object answer = answers.get(name);

        // 1. Check Required
        if (isRequired && (answer == null || answer.toString().trim().isEmpty())) {
            errors.add("Question '" + displayName + "' is required.");
            return;
        }

        // Return if empty and not required (no further validation needed)
        if (answer == null)
            return;

        // 2. Type Validation
        String type = (String) element.get("type"); // text, comment, radiogroup, etc.
        String inputType = (String) element.get("inputType"); // number, date, etc. (mostly for 'text' type)

        if ("text".equals(type) && "number".equals(inputType)) {
            if (!isNumeric(answer)) {
                errors.add("Question '" + displayName + "' must be a valid number.");
            }
        }

        if ("text".equals(type) && "email".equals(inputType)) {
            // Simple basic check, can use regex for stricter validation
            if (!answer.toString().contains("@")) {
                errors.add("Question '" + displayName + "' must be a valid email.");
            }
        }

        // Add more type checks here as needed (min/max, regex, etc.)
    }

    private boolean isNumeric(Object value) {
        if (value instanceof Number)
            return true;
        try {
            Double.parseDouble(value.toString());
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
