package com.form.forms.repository;

import com.form.forms.model.SurveyResponse;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyResponseRepository extends MongoRepository<SurveyResponse, String> {
    List<SurveyResponse> findBySurveyId(String surveyId);

    List<SurveyResponse> findByOrganizationId(String organizationId);
}
