package com.form.forms.repository;

import com.form.forms.model.SurveyResponse;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ResponseRepository extends MongoRepository<SurveyResponse, String> {
    List<SurveyResponse> findBySurveyId(String surveyId);

    List<SurveyResponse> findByOrganizationId(String organizationId);

    long countBySurveyId(String surveyId);

    List<SurveyResponse> findBySurveyIdAndRespondentId(String surveyId, String respondentId);

    List<SurveyResponse> findByOrganizationIdAndRespondentId(String organizationId, String respondentId);
}
