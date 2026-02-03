package com.form.forms.service;

import com.form.forms.model.Project;
import com.form.forms.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    public List<Project> getProjectsByOrganization(String organizationId) {
        return projectRepository.findByOrganizationId(organizationId);
    }

    public List<Project> getProjectsForPM(String organizationId, String pmId) {
        return projectRepository.findByOrganizationIdAndProjectManagerIdsContaining(organizationId, pmId);
    }

    public Project createProject(Project project) {
        return projectRepository.save(project);
    }

    public Project updateProject(String id, Project projectDetails) {
        Optional<Project> optionalProject = projectRepository.findById(id);
        if (optionalProject.isPresent()) {
            Project existingProject = optionalProject.get();
            existingProject.setName(projectDetails.getName());
            existingProject.setDescription(projectDetails.getDescription());
            existingProject.setProjectManagerIds(projectDetails.getProjectManagerIds());
            existingProject.setStatus(projectDetails.getStatus());
            existingProject.setUpdatedAt(new java.util.Date());
            return projectRepository.save(existingProject);
        }
        return null;
    }

    public Optional<Project> getProjectById(String id) {
        return projectRepository.findById(id);
    }
}
