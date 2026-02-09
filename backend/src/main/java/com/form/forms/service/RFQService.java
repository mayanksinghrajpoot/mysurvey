package com.form.forms.service;

import com.form.forms.model.RFQ;
import com.form.forms.model.RFQStatus;
import com.form.forms.repository.RFQRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Date;
import java.util.Optional;

import com.form.forms.model.User;
import com.form.forms.model.Role;
import com.form.forms.repository.UserRepository;
import com.form.forms.model.Project;
import com.form.forms.repository.ProjectRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;

@Service
public class RFQService {

    @Autowired
    private RFQRepository rfqRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    public RFQ createRFQ(RFQ rfq) {
        // Validation: One RFQ per NGO per Project
        Optional<RFQ> existingOpt = rfqRepository.findByProjectIdAndNgoId(rfq.getProjectId(), rfq.getNgoId());

        if (existingOpt.isPresent()) {
            RFQ existing = existingOpt.get();
            if (existing.getStatus() == RFQStatus.REJECTED) {
                // Allow resubmission: Delete old one or update it?
                // For simplicity and to keep history clean, let's delete the old entry (or we
                // could archive it)
                // Here we will delete the old REJECTED one to allow the new one.
                rfqRepository.delete(existing);
            } else {
                throw new RuntimeException("An RFQ already exists for this NGO in this Project.");
            }
        }

        // Validate Budget Breakdown (V2)
        if (rfq.getBudgetBreakdown() != null && !rfq.getBudgetBreakdown().isEmpty()) {
            double calculatedTotal = rfq.getBudgetBreakdown().stream()
                    .mapToDouble(RFQ.BudgetBreakdown::getAmount)
                    .sum();
            rfq.setTotalBudget(calculatedTotal);
        } else {
            // Optional: Enforce breakdown for new RFQs?
            // For now, if no breakdown, rely on totalBudget (backward compatibility)
            if (rfq.getTotalBudget() == null || rfq.getTotalBudget() <= 0) {
                throw new RuntimeException("Total Budget or Budget Breakdown is required.");
            }
        }

        rfq.setStatus(RFQStatus.PENDING_PM);
        rfq.setCreatedAt(new Date());
        return rfqRepository.save(rfq);
    }

    // For PM Dashboard: Get Pending Approvals (Optimized)
    public List<RFQ> getPendingRFQsForPM(String pmId) {
        List<Project> projects = projectRepository.findByProjectManagerIdsContaining(pmId);
        List<String> projectIds = projects.stream().map(Project::getId).toList();
        return rfqRepository.findByProjectIdInAndStatus(projectIds, RFQStatus.PENDING_PM);
    }

    public List<RFQ> getRFQsByProject(String projectId) {
        return rfqRepository.findByProjectId(projectId);
    }

    public List<RFQ> getRFQsByNgo(String ngoId) {
        validateNgoAccess(ngoId);
        return rfqRepository.findByNgoId(ngoId);
    }

    public Optional<RFQ> getRFQByProjectAndNgo(String projectId, String ngoId) {
        validateNgoAccess(ngoId);
        return rfqRepository.findByProjectIdAndNgoId(projectId, ngoId);
    }

    private void validateNgoAccess(String requestedNgoId) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        // Skip check for systems/admins if needed, but for now assuming safety.
        // Better to fetch user to check role.
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (currentUser.getRole() == Role.NGO && !currentUser.getId().equals(requestedNgoId)) {
            throw new AccessDeniedException("Access Denied: You can only view your own RFQs.");
        }
    }

    public List<RFQ> getPendingAdminApprovals() {
        return rfqRepository.findByStatus(RFQStatus.PENDING_ADMIN);
    }

    public RFQ getRFQById(String id) {
        return rfqRepository.findById(id).orElseThrow(() -> new RuntimeException("RFQ not found"));
    }

    public RFQ approveByPM(String rfqId, List<java.util.Map<String, Object>> formatData) {
        RFQ rfq = getRFQById(rfqId);
        if (rfq.getStatus() != RFQStatus.PENDING_PM) {
            throw new RuntimeException("RFQ is not in PENDING_PM status");
        }

        // Save Expense Format if provided
        if (formatData != null && !formatData.isEmpty()) {
            List<RFQ.CustomField> fields = new java.util.ArrayList<>();
            for (java.util.Map<String, Object> f : formatData) {
                String name = (String) f.get("name");
                String type = (String) f.get("type");
                boolean required = Boolean.TRUE.equals(f.get("required"));
                fields.add(new RFQ.CustomField(name, type, required));
            }
            rfq.setExpenseFormat(fields);
        }

        rfq.setStatus(RFQStatus.PENDING_ADMIN);
        rfq.setPmApprovalDate(new Date());
        return rfqRepository.save(rfq);
    }

    public RFQ approveByAdmin(String rfqId) {
        RFQ rfq = getRFQById(rfqId);
        if (rfq.getStatus() != RFQStatus.PENDING_ADMIN) {
            throw new RuntimeException("RFQ is not in PENDING_ADMIN status");
        }
        rfq.setStatus(RFQStatus.APPROVED);
        rfq.setAdminApprovalDate(new Date());
        return rfqRepository.save(rfq);
    }

    public RFQ rejectRFQ(String rfqId, String reason) {
        RFQ rfq = getRFQById(rfqId);
        rfq.setStatus(RFQStatus.REJECTED);
        rfq.setRejectionReason(reason);
        return rfqRepository.save(rfq);
    }
}
