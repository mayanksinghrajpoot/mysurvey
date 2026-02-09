package com.form.forms.service;

import com.form.forms.model.*;
import com.form.forms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired
    private SurveyRepository surveyRepository;

    @Autowired
    private RFQRepository rfqRepository;

    @Autowired
    private RFPRepository rfpRepository;

    @Autowired
    private UtilizationRepository utilizationRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    public Map<String, Object> getNgoDashboardSummary(String ngoId) {
        Map<String, Object> response = new HashMap<>();
        String orgId = com.form.forms.tenant.OrganizationContext.getOrganizationId();

        // 1. Fetch Assigned Surveys
        List<Survey> surveys = surveyRepository.findByOrganizationIdAndAssignedNgoIdsContaining(orgId, ngoId);
        response.put("surveys", surveys);

        // 2. Identify Projects
        Set<String> projectIds = surveys.stream()
                .map(Survey::getProjectId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        response.put("projectIds", projectIds);

        // 3. Fetch RFQs for these projects where NGO is the applicant
        List<RFQ> rfqs = rfqRepository.findByNgoId(ngoId);
        Map<String, RFQ> rfqMap = rfqs.stream()
                .collect(Collectors.toMap(RFQ::getProjectId, rfq -> rfq, (r1, r2) -> r1));
        response.put("rfqMap", rfqMap);

        // 4. Fetch RFPs for these RFQs
        List<String> rfqIds = rfqs.stream().map(RFQ::getId).collect(Collectors.toList());
        List<RFP> rfps = rfpRepository.findByRfqIdIn(rfqIds);
        response.put("rfps", rfps);

        // 5. Fetch Utilizations for these RFPs
        List<String> rfpIds = rfps.stream().map(RFP::getId).collect(Collectors.toList());
        List<Utilization> utilizations = utilizationRepository.findByRfpIdIn(rfpIds);
        response.put("expenses", utilizations);

        return response;
    }

    private Role getCurrentUserRole() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
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
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return userRepository.findByUsername(auth.getName())
                    .map(User::getId)
                    .orElse(null);
        }
        return null;
    }

    public Map<String, Object> getPmDashboardDetail(String pmId) {
        // Security Check: Ensure PM is requesting their own dashboard (or is Admin)
        String currentUserId = getCurrentUserId();
        Role currentRole = getCurrentUserRole();

        if (currentRole == Role.PROJECT_MANAGER) {
            if (currentUserId == null || !currentUserId.equals(pmId)) {
                throw new com.form.forms.exception.ResourceNotFoundException(
                        "Access Denied: You can only view your own dashboard.");
            }
        }

        Map<String, Object> response = new HashMap<>();
        String orgId = com.form.forms.tenant.OrganizationContext.getOrganizationId();

        // 1. Fetch PM's Assigned Projects
        List<Project> projects = projectRepository.findByOrganizationIdAndProjectManagerIdsContaining(orgId, pmId);
        response.put("projects", projects);

        // 2. Fetch Relevant Surveys ONLY (Assigned Projects OR Created By Me)
        List<Survey> createdByMe = surveyRepository.findByOrganizationIdAndCreatedBy(orgId, pmId);
        List<Survey> projectSurveys = new ArrayList<>();
        for (Project p : projects) {
            projectSurveys.addAll(surveyRepository.findByProjectId(p.getId()));
        }

        // Merge and Distinct
        List<Survey> combinedSurveys = new ArrayList<>(createdByMe);
        combinedSurveys.addAll(projectSurveys);
        List<Survey> distinctSurveys = combinedSurveys.stream()
                .filter(com.form.forms.util.DistinctByKey.distinctByKey(Survey::getId))
                .collect(Collectors.toList());

        response.put("surveys", distinctSurveys);

        // 3. Fetch Operations Data (RFQs, RFPs, Utilizations)
        // Filter by Project IDs found above
        List<String> projectIds = projects.stream().map(Project::getId).collect(Collectors.toList());

        List<RFQ> rfqs = new ArrayList<>();
        for (String pid : projectIds) {
            rfqs.addAll(rfqRepository.findByProjectId(pid));
        }
        response.put("rfqs", rfqs);

        List<String> rfqIds = rfqs.stream().map(RFQ::getId).collect(Collectors.toList());
        List<RFP> rfps = rfqRepository.findByProjectId(null) != null ? new ArrayList<>() : new ArrayList<>(); // Initialize
                                                                                                              // empty
                                                                                                              // if
                                                                                                              // needed,
                                                                                                              // logic
                                                                                                              // below
        // Actually findByRfqIdIn is better
        if (!rfqIds.isEmpty()) {
            rfps = rfpRepository.findByRfqIdIn(rfqIds);
        } else {
            rfps = new ArrayList<>();
        }
        response.put("rfps", rfps);

        List<String> rfpIds = rfps.stream().map(RFP::getId).collect(Collectors.toList());
        List<Utilization> utilizations = new ArrayList<>();
        if (!rfpIds.isEmpty()) {
            utilizations = utilizationRepository.findByRfpIdIn(rfpIds);
        }
        response.put("utilizations", utilizations);

        return response;
    }
}
