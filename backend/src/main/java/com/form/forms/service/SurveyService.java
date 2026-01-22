package com.form.forms.service;

import com.form.forms.model.Survey;
import com.form.forms.model.SurveyResponse;
import com.form.forms.repository.ResponseRepository;
import com.form.forms.repository.SurveyRepository;
import com.form.forms.tenant.TenantContext;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.Map;
// import java.util.UUID;

@Service
public class SurveyService {

    private final SurveyRepository surveyRepository;
    private final ResponseRepository responseRepository;

    public SurveyService(SurveyRepository surveyRepository, ResponseRepository responseRepository) {
        this.surveyRepository = surveyRepository;
        this.responseRepository = responseRepository;
    }

    public Survey createSurvey(Survey survey) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new RuntimeException("Tenant context is missing");
        }
        survey.setTenantId(tenantId);
        if (survey.getCreatedAt() == null) {
            survey.setCreatedAt(new Date());
        }
        return surveyRepository.save(survey);
    }

    public List<Survey> getAllSurveys() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            // If no tenant context (and presumable Admin check passed or public), return
            // ALL
            // However, we should ensure only Admin can reach this state (via Security
            // Config or Filter logic).
            return surveyRepository.findAll();
        }
        return surveyRepository.findByTenantId(tenantId);
    }

    public Survey getSurvey(String id) {
        String tenantId = TenantContext.getTenantId();
        return surveyRepository.findById(id)
                .filter(s -> tenantId == null || s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));
    }

    // Public access to survey definition
    public Survey getSurveyForRunner(String id) {
        return surveyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Survey not found"));
    }

    public SurveyResponse submitResponse(String surveyId, Map<String, Object> payload) {
        Survey survey = surveyRepository.findById(surveyId)
                .orElseThrow(() -> new RuntimeException("Survey not found"));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyId(surveyId);
        response.setTenantId(survey.getTenantId());

        // Set Version to match survey
        response.setSurveyVersion(survey.getVersion());

        // Extract Answers and Metadata
        if (payload.containsKey("answers")) {
            response.setAnswers((Map<String, Object>) payload.get("answers"));
        }
        if (payload.containsKey("metadata")) {
            response.setMetadata((Map<String, Object>) payload.get("metadata"));
        }

        response.setStatus(com.form.forms.model.ResponseStatus.COMPLETED);
        response.setSubmittedAt(new Date());

        return responseRepository.save(response);
    }

    public List<SurveyResponse> getSurveyResponses(String surveyId) {
        String tenantId = TenantContext.getTenantId();
        // Validate survey belongs to tenant (or if Global Admin/null context, allow
        // check)
        // If tenantId is null, we assume Admin has access (filtered by GetAll logic
        // mostly)
        // Ideally we should also check if the user IS admin, but relying on the fact
        // that
        // only Admins can have null context (via filter) is consistent with
        // getAllSurveys
        Survey survey = surveyRepository.findById(surveyId)
                .filter(s -> tenantId == null || s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));

        return responseRepository.findBySurveyId(surveyId);
    }
}
