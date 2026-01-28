package com.form.forms.repository;

import com.form.forms.model.Survey;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SurveyRepository extends MongoRepository<Survey, String> {
    List<Survey> findByOrganizationId(String organizationId);

    // For PMs
    List<Survey> findByOrganizationIdAndCreatedBy(String organizationId, String createdBy);

    // For NGOs
    List<Survey> findByOrganizationIdAndAssignedNgoIdsContaining(String organizationId, String ngoId);

    // For Projects
    List<Survey> findByProjectId(String projectId);
}
