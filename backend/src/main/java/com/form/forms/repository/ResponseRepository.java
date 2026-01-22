package com.form.forms.repository;

import com.form.forms.model.SurveyResponse;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ResponseRepository extends MongoRepository<SurveyResponse, String> {
    List<SurveyResponse> findBySurveyId(String surveyId);

    List<SurveyResponse> findByTenantId(String tenantId);

    long countBySurveyId(String surveyId);
}
