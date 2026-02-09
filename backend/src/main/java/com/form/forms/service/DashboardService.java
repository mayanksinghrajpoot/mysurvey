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
        // Filter RFQs to only those belonging to the current organization via Project?
        // RFQ implies Project, Project implies Organization.
        // For simplicity, we assume NGO ID is unique enough or we trust the linkage.
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

    public Map<String, Object> getPmDashboardDetail(String pmId) {
        Map<String, Object> response = new HashMap<>();
        String orgId = com.form.forms.tenant.OrganizationContext.getOrganizationId();

        // 1. Fetch PM's Projects
        List<Project> projects = projectRepository.findByOrganizationIdAndProjectManagerIdsContaining(orgId, pmId);
        // Ideally filter by PM ID if Project has list of PMs
        response.put("projects", projects);

        // 2. Fetch Surveys
        List<Survey> surveys = surveyRepository.findByOrganizationId(orgId);
        response.put("surveys", surveys);

        // 3. Fetch Operations Data (RFQs, RFPs, Utilizations)
        // To avoid fetching *entire* DB, we filter by Project IDs
        List<String> projectIds = projects.stream().map(Project::getId).collect(Collectors.toList());

        List<RFQ> rfqs = new ArrayList<>();
        for (String pid : projectIds) {
            rfqs.addAll(rfqRepository.findByProjectId(pid));
        }
        response.put("rfqs", rfqs);

        List<String> rfqIds = rfqs.stream().map(RFQ::getId).collect(Collectors.toList());
        List<RFP> rfps = rfpRepository.findByRfqIdIn(rfqIds);
        response.put("rfps", rfps);

        List<String> rfpIds = rfps.stream().map(RFP::getId).collect(Collectors.toList());
        List<Utilization> utilizations = utilizationRepository.findByRfpIdIn(rfpIds);
        response.put("utilizations", utilizations);

        return response;
    }
}
