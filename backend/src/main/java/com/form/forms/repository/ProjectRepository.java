package com.form.forms.repository;

import com.form.forms.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByOrganizationId(String organizationId);

    List<Project> findByOrganizationIdAndProjectManagerIdsContaining(String organizationId, String projectManagerId);

    List<Project> findByProjectManagerIdsContaining(String projectManagerId);
}
