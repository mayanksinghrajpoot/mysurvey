package com.form.forms.controller;

import com.form.forms.model.Project;
import com.form.forms.model.User;
import com.form.forms.repository.UserRepository;
import com.form.forms.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.form.forms.repository.SurveyRepository surveyRepository;

    @GetMapping("/{id}/surveys")
    public ResponseEntity<List<com.form.forms.model.Survey>> getProjectSurveys(@PathVariable String id) {
        // TODO: specific security checks?
        return ResponseEntity.ok(surveyRepository.findByProjectId(id));
    }

    // We should better use the User object to get role and org ID
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (String) auth.getPrincipal();
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping
    public ResponseEntity<List<Project>> getProjects(@RequestHeader("X-ORGANIZATION-ID") String organizationId) {
        User user = getCurrentUser();
        if (user == null)
            return ResponseEntity.status(401).build();

        // If specific logic for PM vs Admin
        if (user.getRole().name().equals("PROJECT_MANAGER")) {
            return ResponseEntity.ok(projectService.getProjectsForPM(organizationId, user.getId()));
        }

        // Admin sees all
        return ResponseEntity.ok(projectService.getProjectsByOrganization(organizationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable String id) {
        return projectService.getProjectById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project,
            @RequestHeader("X-ORGANIZATION-ID") String organizationId) {
        User user = getCurrentUser();
        // Only Admin can create projects
        if (user != null && (user.getRole().name().equals("ADMIN") || user.getRole().name().equals("SUPER_ADMIN"))) {
            project.setOrganizationId(organizationId);
            return ResponseEntity.ok(projectService.createProject(project));
        }
        return ResponseEntity.status(403).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable String id, @RequestBody Project project) {
        User user = getCurrentUser();
        // Only Admin can update projects (assign PM)
        if (user != null && (user.getRole().name().equals("ADMIN") || user.getRole().name().equals("SUPER_ADMIN"))) {
            return ResponseEntity.ok(projectService.updateProject(id, project));
        }
        return ResponseEntity.status(403).build();
    }
}
