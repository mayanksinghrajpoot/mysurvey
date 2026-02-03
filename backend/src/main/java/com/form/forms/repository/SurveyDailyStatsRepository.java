package com.form.forms.repository;

import com.form.forms.model.SurveyDailyStats;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyDailyStatsRepository extends MongoRepository<SurveyDailyStats, String> {
    Optional<SurveyDailyStats> findBySurveyIdAndDate(String surveyId, String date);

    List<SurveyDailyStats> findBySurveyIdAndDateBetween(String surveyId, String startDate, String endDate);

    List<SurveyDailyStats> findBySurveyId(String surveyId);
}
