package com.form.forms.service;

import com.form.forms.model.Role;
import com.form.forms.model.Survey;
import com.form.forms.model.SurveyResponse;
import com.form.forms.repository.ResponseRepository;
import com.form.forms.repository.SurveyRepository;
import com.form.forms.repository.UserRepository;
import com.form.forms.tenant.OrganizationContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
public class SurveyService {

    private final SurveyRepository surveyRepository;
    private final ResponseRepository responseRepository;
    private final SchemaValidator schemaValidator;
    private final UserRepository userRepository;

    public SurveyService(SurveyRepository surveyRepository, ResponseRepository responseRepository,
            SchemaValidator schemaValidator, UserRepository userRepository) {
        this.surveyRepository = surveyRepository;
        this.responseRepository = responseRepository;
        this.schemaValidator = schemaValidator;
        this.userRepository = userRepository;
    }

    private Role getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            String roleName = auth.getAuthorities().stream()
                    .findFirst()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .orElse(null);
            if (roleName != null) {
                return Role.valueOf(roleName);
            }
        }
        return null;
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return userRepository.findByUsername(auth.getName())
                    .map(com.form.forms.model.User::getId)
                    .orElse(null);
        }
        return null;
    }

    public Survey createSurvey(Survey survey) {
        String organizationId = OrganizationContext.getOrganizationId();
        if (organizationId == null) {
            throw new RuntimeException("Organization context is missing");
        }
        survey.setOrganizationId(organizationId);

        // Ensure projectId is valid if provided
        if (survey.getProjectId() != null) {
            // TODO: Validate projectId belongs to organization
        }
        if (survey.getCreatedAt() == null) {
            survey.setCreatedAt(new Date());
        }

        String userId = getCurrentUserId();
        if (userId != null) {
            survey.setCreatedBy(userId);
        }

        if (survey.getMinifiedKeys() == null || survey.getMinifiedKeys().isEmpty()) {
            survey.setMinifiedKeys(generateMinifiedKeys(survey));
        }

        return surveyRepository.save(survey);
    }

    public Survey updateSurvey(String id, Survey updates) {
        String organizationId = OrganizationContext.getOrganizationId();
        Survey survey = surveyRepository.findById(id)
                .filter(s -> organizationId == null || s.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));

        if (updates.getTitle() != null)
            survey.setTitle(updates.getTitle());
        if (updates.getDescription() != null)
            survey.setDescription(updates.getDescription());
        if (updates.getSurveyJson() != null) {
            survey.setSurveyJson(updates.getSurveyJson());
            survey.setMinifiedKeys(generateMinifiedKeys(survey));
        }
        if (updates.getAssignedNgoIds() != null) {
            // Validate: If PM, ensure assigned NGOs are associated with them
            Role role = getCurrentUserRole();
            if (role == Role.PROJECT_MANAGER) {
                String pmId = getCurrentUserId();
                List<String> validNgoIds = userRepository.findByOrganizationId(organizationId).stream()
                        .filter(u -> u.getRole() == Role.NGO && u.getAssociatedPmIds() != null
                                && u.getAssociatedPmIds().contains(pmId))
                        .map(com.form.forms.model.User::getId)
                        .toList();

                for (String ngoId : updates.getAssignedNgoIds()) {
                    if (!validNgoIds.contains(ngoId)) {
                        throw new RuntimeException(
                                "Unauthorized assignment: NGO " + ngoId + " is not associated with you.");
                    }
                }
            }
            survey.setAssignedNgoIds(updates.getAssignedNgoIds());
        }

        // Allow Admins to transfer ownership (Assign to PM)
        if (updates.getCreatedBy() != null) {
            Role role = getCurrentUserRole();
            if (role == Role.ADMIN || role == Role.SUPER_ADMIN) {
                survey.setCreatedBy(updates.getCreatedBy());
            } else {
                // Ignore or throw? Usually better to ignore if not authorized to change field,
                // but if they explicitly sent it, maybe throw. For now, we'll allow it only if
                // Admin.
                // If PM tries to change it, it's ignored.
            }
        }

        survey.setUpdatedAt(new Date());
        return surveyRepository.save(survey);
    }

    private Map<String, String> generateMinifiedKeys(Survey survey) {
        Map<String, String> map = new java.util.HashMap<>();
        Map<String, Object> json = survey.getSurveyJson();
        if (json == null || !json.containsKey("pages"))
            return map;

        List<Map<String, Object>> pages = (List<Map<String, Object>>) json.get("pages");
        int counter = 1;

        for (Map<String, Object> page : pages) {
            List<Map<String, Object>> elements = (List<Map<String, Object>>) page.get("elements");
            if (elements != null) {
                for (Map<String, Object> el : elements) {
                    String name = (String) el.get("name");
                    map.put(name, "q" + counter++);
                }
            }
        }
        return map;
    }

    public List<Survey> getAllSurveys() {
        String organizationId = OrganizationContext.getOrganizationId();
        Role role = getCurrentUserRole();

        if (role == Role.SUPER_ADMIN && organizationId == null) {
            return surveyRepository.findAll();
        }

        if (organizationId == null)
            throw new RuntimeException("Organization Context Missing");

        if (role == Role.ADMIN || role == Role.SUPER_ADMIN) {
            return surveyRepository.findByOrganizationId(organizationId);
        } else if (role == Role.PROJECT_MANAGER) {
            String userId = getCurrentUserId();
            // TODO: Also filter by Project Assignment?
            // Current Logic: Created By Me. New Logic: In Projects Assigned To Me.
            // For now, let's keep Created By Me as a fallback or assume PMs still "create"
            // surveys.
            // Ideally: return surveyRepository.findByProjectIdIn(projectIds);
            if (userId != null) {
                return surveyRepository.findByOrganizationIdAndCreatedBy(organizationId, userId);
            }
            return List.of();
        } else if (role == Role.NGO) {
            String userId = getCurrentUserId();
            if (userId != null) {
                return surveyRepository.findByOrganizationIdAndAssignedNgoIdsContaining(organizationId, userId);
            }
            return List.of();
        }

        return List.of();
    }

    public Survey getSurvey(String id) {
        String organizationId = OrganizationContext.getOrganizationId();
        return surveyRepository.findById(id)
                .filter(s -> organizationId == null || s.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));
    }

    public Survey getSurveyForRunner(String id) {
        return surveyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Survey not found"));
    }

    @SuppressWarnings("unchecked")
    public SurveyResponse submitResponse(String surveyId, Map<String, Object> payload) {
        Survey survey = surveyRepository.findById(surveyId)
                .orElseThrow(() -> new RuntimeException("Survey not found"));

        Map<String, Object> answers = null;
        if (payload.containsKey("answers")) {
            answers = (Map<String, Object>) payload.get("answers");
        }

        if (answers != null) {
            List<String> validationErrors = schemaValidator.validate(survey, answers);
            if (!validationErrors.isEmpty()) {
                throw new RuntimeException("Validation failed: " + String.join(", ", validationErrors));
            }

            if (survey.getMinifiedKeys() != null && !survey.getMinifiedKeys().isEmpty()) {
                Map<String, Object> compressedAnswers = new java.util.HashMap<>();
                for (Map.Entry<String, Object> entry : answers.entrySet()) {
                    String shortKey = survey.getMinifiedKeys().get(entry.getKey());
                    compressedAnswers.put(shortKey != null ? shortKey : entry.getKey(), entry.getValue());
                }
                answers = compressedAnswers;
            }
        }

        SurveyResponse response = new SurveyResponse();
        response.setSurveyId(surveyId);
        response.setOrganizationId(survey.getOrganizationId());
        response.setSurveyVersion(survey.getVersion());

        // Respondent Logic
        Role role = getCurrentUserRole();
        String userId = getCurrentUserId();

        if (role != null && userId != null) {
            // Authenticated User (NGO, PM, Admin) - Always attribute to them
            response.setRespondentId(userId);
        } else {
            // Public submission (Check for referral in payload)
            if (payload.containsKey("respondentId")) {
                response.setRespondentId((String) payload.get("respondentId"));
            }
        }

        if (answers != null) {
            response.setAnswers(answers);
        }
        if (payload.containsKey("metadata")) {
            response.setMetadata((Map<String, Object>) payload.get("metadata"));
        }

        response.setStatus(com.form.forms.model.ResponseStatus.COMPLETED);
        response.setSubmittedAt(new Date());

        return responseRepository.save(response);
    }

    public List<SurveyResponse> getSurveyResponses(String surveyId) {
        String organizationId = OrganizationContext.getOrganizationId();
        Survey survey = surveyRepository.findById(surveyId)
                .filter(s -> organizationId == null || s.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));

        Role role = getCurrentUserRole();
        List<SurveyResponse> responses;

        if (role == Role.NGO) {
            String userId = getCurrentUserId();
            if (userId != null) {
                responses = responseRepository.findBySurveyIdAndRespondentId(surveyId, userId);
            } else {
                responses = List.of();
            }
        } else {
            // PM or Admin: gets all
            responses = responseRepository.findBySurveyId(surveyId);
        }

        if (survey.getMinifiedKeys() != null && !survey.getMinifiedKeys().isEmpty()) {
            Map<String, String> reverseMap = new java.util.HashMap<>();
            for (Map.Entry<String, String> entry : survey.getMinifiedKeys().entrySet()) {
                reverseMap.put(entry.getValue(), entry.getKey());
            }

            for (SurveyResponse r : responses) {
                if (r.getAnswers() != null) {
                    Map<String, Object> decompressed = new java.util.HashMap<>();
                    for (Map.Entry<String, Object> entry : r.getAnswers().entrySet()) {
                        String originalKey = reverseMap.get(entry.getKey());
                        decompressed.put(originalKey != null ? originalKey : entry.getKey(), entry.getValue());
                    }
                    r.setAnswers(decompressed);
                }
            }
        }

        return responses;
    }
}
