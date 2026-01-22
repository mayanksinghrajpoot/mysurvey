package com.form.forms.repository;

import com.form.forms.model.Survey;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SurveyRepository extends MongoRepository<Survey, String> {
    List<Survey> findByTenantId(String tenantId);
}
