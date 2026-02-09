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

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

@Service
public class SurveyService {

    private final SurveyRepository surveyRepository;
    private final ResponseRepository responseRepository;
    private final SchemaValidator schemaValidator;
    private final UserRepository userRepository;
    private final com.form.forms.repository.ProjectRepository projectRepository;
    private final AnalyticsService analyticsService;
    private final MongoTemplate mongoTemplate;

    public SurveyService(SurveyRepository surveyRepository, ResponseRepository responseRepository,
            SchemaValidator schemaValidator, UserRepository userRepository,
            com.form.forms.repository.ProjectRepository projectRepository,
            AnalyticsService analyticsService,
            MongoTemplate mongoTemplate) {
        this.surveyRepository = surveyRepository;
        this.responseRepository = responseRepository;
        this.schemaValidator = schemaValidator;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.analyticsService = analyticsService;
        this.mongoTemplate = mongoTemplate;
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
        Role role = getCurrentUserRole();

        // Enforce Project Assignment for PMs
        if (role == Role.PROJECT_MANAGER && survey.getProjectId() == null) {
            throw new RuntimeException("Project Managers must assign a survey to a project.");
        }

        if (survey.getProjectId() != null) {
            String projectId = survey.getProjectId();
            String userId = getCurrentUserId();

            com.form.forms.model.Project project = projectRepository.findById(projectId)
                    .filter(p -> p.getOrganizationId().equals(organizationId))
                    .orElseThrow(() -> new RuntimeException("Project not found or access denied"));

            if (role == Role.PROJECT_MANAGER) {
                if (project.getProjectManagerIds() == null || !project.getProjectManagerIds().contains(userId)) {
                    throw new RuntimeException("Unauthorized: You are not a manager of this project.");
                }
            }
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
        System.out.println("DEBUG: updateSurvey called for ID: " + id);
        String organizationId = OrganizationContext.getOrganizationId();
        Survey survey = surveyRepository.findById(id)
                .filter(s -> organizationId == null || s.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));

        if (updates.getTitle() != null)
            survey.setTitle(updates.getTitle());
        if (updates.getDescription() != null)
            survey.setDescription(updates.getDescription());

        if (updates.getSurveyJson() != null) {
            System.out.println("DEBUG: Updating Survey JSON");
            survey.setSurveyJson(updates.getSurveyJson());
            try {
                survey.setMinifiedKeys(generateMinifiedKeys(survey));
            } catch (Exception e) {
                System.err.println("DEBUG: Failed to generate minified keys: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Error processing survey structure: " + e.getMessage());
            }
        }

        if (updates.getAssignedNgoIds() != null) {
            System.out.println("DEBUG: Updating NGO Assignments: " + updates.getAssignedNgoIds());
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
                        System.err.println("DEBUG: Unauthorized NGO assignment: " + ngoId);
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
            }
        }

        survey.setUpdatedAt(new Date());
        System.out.println("DEBUG: Saving updated survey");
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
            if (userId != null) {
                // 1. Get Surveys created by them (Legacy)
                List<Survey> createdByMe = surveyRepository.findByOrganizationIdAndCreatedBy(organizationId, userId);

                // 2. Get Surveys from Projects they are assigned to
                List<com.form.forms.model.Project> myProjects = projectRepository
                        .findByOrganizationIdAndProjectManagerIdsContaining(organizationId, userId);
                List<Survey> projectSurveys = new java.util.ArrayList<>();
                for (com.form.forms.model.Project p : myProjects) {
                    projectSurveys.addAll(surveyRepository.findByProjectId(p.getId()));
                }

                // Merge and Distinct by ID
                java.util.List<Survey> combinedList = new java.util.ArrayList<>(createdByMe);
                combinedList.addAll(projectSurveys);

                return combinedList.stream()
                        .filter(com.form.forms.util.DistinctByKey.distinctByKey(Survey::getId))
                        .collect(java.util.stream.Collectors.toList());
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
        Survey survey = surveyRepository.findById(id)
                .filter(s -> organizationId == null || s.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));

        // Security Check for PM
        Role role = getCurrentUserRole();
        if (role == Role.PROJECT_MANAGER) {
            String userId = getCurrentUserId();
            if (userId != null) {
                boolean hasAccess = false;
                // 1. Owner (Created by me)
                if (userId.equals(survey.getCreatedBy())) {
                    hasAccess = true;
                }

                // 2. Project Manager (Assigned to Project)
                if (!hasAccess && survey.getProjectId() != null) {
                    hasAccess = projectRepository.findById(survey.getProjectId())
                            .map(p -> p.getProjectManagerIds() != null && p.getProjectManagerIds().contains(userId))
                            .orElse(false);
                }

                if (!hasAccess) {
                    throw new RuntimeException("Access Denied: You do not have permission to view this survey.");
                }
            }
        }
        return survey;
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

        SurveyResponse saved = responseRepository.save(response);
        analyticsService.logResponse(saved);
        return saved;
    }

    public List<SurveyResponse> getSurveyResponses(String surveyId) {
        return getFilteredResponses(surveyId, null, null);
    }

    public List<SurveyResponse> getFilteredResponses(String surveyId, String questionKey, String answerValue) {
        String organizationId = OrganizationContext.getOrganizationId();
        Survey survey = surveyRepository.findById(surveyId)
                .filter(s -> organizationId == null || s.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new RuntimeException("Survey not found or access denied"));

        Role role = getCurrentUserRole();
        String userId = getCurrentUserId();

        // ACL Logic
        if (role == Role.NGO) {
            if (userId != null) {
                // Check if NGO is assigned to this survey?
                // Currently just checking if they are the respondent for THEIR responses.
                // But this method returns LIST of responses.
                // So NGO sees only their own responses.
            } else {
                return List.of();
            }
        } else if (role == Role.PROJECT_MANAGER) {
            if (userId != null) {
                boolean hasAccess = false;
                // 1. Owner
                if (userId.equals(survey.getCreatedBy()))
                    hasAccess = true;
                // 2. Project Manager
                if (!hasAccess && survey.getProjectId() != null) {
                    hasAccess = projectRepository.findById(survey.getProjectId())
                            .map(p -> p.getProjectManagerIds() != null && p.getProjectManagerIds().contains(userId))
                            .orElse(false);
                }
                if (!hasAccess) {
                    throw new RuntimeException(
                            "Access Denied: You do not have permission to view responses for this survey.");
                }
            }
        }

        // Build Dynamic Query
        Query query = new Query();
        query.addCriteria(Criteria.where("surveyId").is(surveyId));

        if (role == Role.NGO && userId != null) {
            query.addCriteria(Criteria.where("respondentId").is(userId));
        }

        // Drill-down Filter
        if (questionKey != null && !questionKey.isEmpty() && answerValue != null) {
            String fieldPath = "answers." + questionKey;

            List<Object> potentialValues = new ArrayList<>();
            potentialValues.add(answerValue); // Add raw string

            // Try Boolean
            if ("true".equalsIgnoreCase(answerValue))
                potentialValues.add(true);
            else if ("false".equalsIgnoreCase(answerValue))
                potentialValues.add(false);

            // Try Number (Integer and Double)
            try {
                Double d = Double.parseDouble(answerValue);
                potentialValues.add(d);
                if (d % 1 == 0) {
                    potentialValues.add(d.intValue());
                    potentialValues.add(d.longValue());
                }
            } catch (NumberFormatException e) {
                // Not a number, ignore
            }

            // Use 'IN' to match any of the potential representations (String, Int, Double,
            // Boolean)
            query.addCriteria(Criteria.where(fieldPath).in(potentialValues));
        }

        List<SurveyResponse> responses = mongoTemplate.find(query, SurveyResponse.class);

        // Decompression Logic (Shared)
        try {
            if (survey.getMinifiedKeys() != null && !survey.getMinifiedKeys().isEmpty()) {
                Map<String, String> reverseMap = new java.util.HashMap<>();
                for (Map.Entry<String, String> entry : survey.getMinifiedKeys().entrySet()) {
                    if (entry.getValue() != null) {
                        reverseMap.put(entry.getValue(), entry.getKey());
                    }
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
        } catch (Exception e) {
            System.err.println("Error decompressing responses: " + e.getMessage());
        }

        return responses;
    }
}
