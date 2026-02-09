package com.form.forms.controller;

import com.form.forms.model.Project;
import com.form.forms.model.User;
import com.form.forms.repository.UserRepository;
import com.form.forms.service.ProjectService;
import com.form.forms.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.BadCredentialsException;
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
        User user = getCurrentUser();
        Project project = projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Security Check
        if (user != null && user.getRole() == com.form.forms.model.Role.PROJECT_MANAGER) {
            String organizationId = user.getOrganizationId();
            // Check Org
            if (!project.getOrganizationId().equals(organizationId)) {
                throw new AccessDeniedException("Access Denied: Project belongs to another organization");
            }
            // Check Assignment
            if (project.getProjectManagerIds() == null || !project.getProjectManagerIds().contains(user.getId())) {
                throw new AccessDeniedException("Access Denied: You are not assigned to this project");
            }
        }

        return ResponseEntity.ok(surveyRepository.findByProjectId(id));
    }

    // We should better use the User object to get role and org ID
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            return null;

        String username = null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            username = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else if (principal instanceof String) {
            username = (String) principal;
        }

        if (username == null)
            return null;
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping
    public ResponseEntity<List<Project>> getProjects(
            @RequestHeader(value = "X-ORGANIZATION-ID", required = false) String organizationIdHeader) {
        User user = getCurrentUser();
        if (user == null) {
            throw new BadCredentialsException("User not authenticated");
        }

        String organizationId = organizationIdHeader;
        if (organizationId == null) {
            organizationId = user.getOrganizationId();
        }

        // If specific logic for PM vs Admin
        if (user.getRole() == com.form.forms.model.Role.PROJECT_MANAGER) {
            return ResponseEntity.ok(projectService.getProjectsForPM(organizationId, user.getId()));
        }

        // Admin sees all
        return ResponseEntity.ok(projectService.getProjectsByOrganization(organizationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable String id) {
        User user = getCurrentUser();
        Project project = projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        // Security Check
        if (user != null && user.getRole() == com.form.forms.model.Role.PROJECT_MANAGER) {
            String organizationId = user.getOrganizationId();
            // Check Org
            if (!project.getOrganizationId().equals(organizationId)) {
                throw new AccessDeniedException("Access Denied: Project belongs to another organization");
            }
            // Check Assignment
            if (project.getProjectManagerIds() == null || !project.getProjectManagerIds().contains(user.getId())) {
                throw new AccessDeniedException("Access Denied: You are not assigned to this project");
            }
        }

        return ResponseEntity.ok(project);
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
        throw new AccessDeniedException("Only Admins can create projects");
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable String id, @RequestBody Project project) {
        User user = getCurrentUser();
        // Only Admin can update projects (assign PM)
        if (user != null && (user.getRole().name().equals("ADMIN") || user.getRole().name().equals("SUPER_ADMIN"))) {
            return ResponseEntity.ok(projectService.updateProject(id, project));
        }
        throw new AccessDeniedException("Only Admins can update projects");
    }

    @PostMapping("/{id}/managers")
    public ResponseEntity<Project> addManager(@PathVariable String id,
            @RequestBody java.util.Map<String, String> payload) {
        String pmId = payload.get("pmId");
        Project project = projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        project.getProjectManagerIds().add(pmId);
        return ResponseEntity.ok(projectService.updateProject(id, project));
    }

    @DeleteMapping("/{id}/managers/{pmId}")
    public ResponseEntity<Project> removeManager(@PathVariable String id, @PathVariable String pmId) {
        Project project = projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        project.getProjectManagerIds().remove(pmId);
        return ResponseEntity.ok(projectService.updateProject(id, project));
    }
}
