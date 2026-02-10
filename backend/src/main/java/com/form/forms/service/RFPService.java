package com.form.forms.service;

import com.form.forms.model.RFP;
import com.form.forms.model.RFPStatus;
import com.form.forms.model.RFQ;
import com.form.forms.model.RFQStatus;
import com.form.forms.repository.RFPRepository;
import com.form.forms.repository.RFQRepository;
import com.form.forms.model.Project;
import com.form.forms.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Date;
import java.util.stream.Collectors;

@Service
public class RFPService {

    @Autowired
    private RFPRepository rfpRepository;

    @Autowired
    private RFQRepository rfqRepository;

    @Autowired
    private ProjectRepository projectRepository;

    public RFP createRFP(RFP rfp) {
        // Validate Parent RFQ
        RFQ parentRFQ = rfqRepository.findById(rfp.getRfqId())
                .orElseThrow(() -> new RuntimeException("Parent RFQ not found"));

        if (parentRFQ.getStatus() != RFQStatus.APPROVED) {
            throw new RuntimeException("Cannot submit RFP. Parent RFQ is not APPROVED.");
        }

        // Validate Budget
        List<RFP> existingRFPs = rfpRepository.findByRfqId(rfp.getRfqId());
        double usedBudget = existingRFPs.stream()
                .filter(r -> r.getStatus() != RFPStatus.REJECTED)
                .mapToDouble(RFP::getAmount)
                .sum();

        if (usedBudget + rfp.getAmount() > parentRFQ.getTotalBudget()) {
            throw new RuntimeException("RFP amount exceeds remaining RFQ budget.");
        }

        rfp.setStatus(RFPStatus.PENDING_PM);
        rfp.setCreatedAt(new Date());
        return rfpRepository.save(rfp);
    }

    public List<RFP> getRFPsByRFQ(String rfqId) {
        return rfpRepository.findByRfqId(rfqId);
    }

    public List<RFP> getRFPsByNgo(String ngoId) {
        return rfpRepository.findByNgoId(ngoId);
    }

    // PM Approval Step
    public RFP approveByPM(String rfpId) {
        RFP rfp = rfpRepository.findById(rfpId)
                .orElseThrow(() -> new RuntimeException("RFP not found"));

        if (rfp.getStatus() != RFPStatus.PENDING_PM && rfp.getStatus() != RFPStatus.PENDING) {
            throw new RuntimeException("RFP is not pending PM approval");
        }

        rfp.setStatus(RFPStatus.PENDING_ADMIN);
        rfp.setPmApprovalDate(new Date());
        return rfpRepository.save(rfp);
    }

    // Admin Approval Step
    public RFP approveByAdmin(String rfpId) {
        RFP rfp = rfpRepository.findById(rfpId)
                .orElseThrow(() -> new RuntimeException("RFP not found"));

        if (rfp.getStatus() != RFPStatus.PENDING_ADMIN) {
            throw new RuntimeException("RFP is not pending Admin approval");
        }

        rfp.setStatus(RFPStatus.APPROVED);
        rfp.setAdminApprovalDate(new Date());
        rfp.setDecisionDate(new Date());
        return rfpRepository.save(rfp);
    }

    public RFP rejectRFP(String rfpId, String reason) {
        RFP rfp = rfpRepository.findById(rfpId)
                .orElseThrow(() -> new RuntimeException("RFP not found"));
        rfp.setStatus(RFPStatus.REJECTED);
        rfp.setRejectionReason(reason);
        rfp.setDecisionDate(new Date());
        return rfpRepository.save(rfp);
    }

    // Retrieve Pending RFPs for PM's Project List
    public List<RFP> getPendingRFPsForProject(String projectId) {
        // Find RFQs in this project
        List<RFQ> rfqs = rfqRepository.findByProjectId(projectId);
        List<String> rfqIds = rfqs.stream().map(RFQ::getId).collect(Collectors.toList());

        // Find RFPs for these RFQs that are PENDING_PM
        // Using inefficient memory filter matching previous patterns for speed, ideally
        // Repo query
        List<RFP> allRfps = rfqIds.stream()
                .flatMap(id -> rfpRepository.findByRfqId(id).stream())
                .collect(Collectors.toList());

        return allRfps.stream()
                .filter(r -> r.getStatus() == RFPStatus.PENDING_PM || r.getStatus() == RFPStatus.PENDING)
                .collect(Collectors.toList());
    }

    // For PM Dashboard: Get Pending Approvals (Optimized)
    public List<RFP> getPendingRFPsForPM(String pmId) {
        List<Project> projects = projectRepository.findByProjectManagerIdsContaining(pmId);
        List<String> projectIds = projects.stream().map(Project::getId).toList();

        // Find all RFQs in these projects (regardless of status, as we need to find
        // RFPs linked to them)
        List<RFQ> rfqs = rfqRepository.findByProjectIdInAndStatus(projectIds, com.form.forms.model.RFQStatus.APPROVED);
        // Note: Usually only APPROVED RFQs have RFPs, but we can also check broadly if
        // needed.
        // Actually, let's use a custom query or just fetch all RFQs for these projects.
        // For simplicity and correctness with existing repo methods:
        // We need all RFQs for these projects to find related RFPs.
        // But `findByProjectIdInAndStatus` filters by status.
        // Let's use `rfqRepository.findByProjectId(projectId)` looped or add a new repo
        // method `findByProjectIdIn`.
        // Given current repo, let's just use the `APPROVED` status assumption for RFPs.

        List<String> rfqIds = rfqs.stream().map(RFQ::getId).toList();
        return rfpRepository.findByRfqIdInAndStatus(rfqIds, RFPStatus.PENDING_PM);
    }

    public List<RFP> getPendingAdminApprovals() {
        return rfpRepository.findAll().stream()
                .filter(r -> r.getStatus() == RFPStatus.PENDING_ADMIN)
                .collect(Collectors.toList());
    }

    public RFP updateRFP(String id, RFP updatedRfp) {
        RFP existing = rfpRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("RFP not found"));

        if (existing.getStatus() != RFPStatus.REJECTED) {
            throw new RuntimeException("Only REJECTED RFPs can be modified and resubmitted.");
        }

        // Validate Parent RFQ again just in case
        RFQ parentRFQ = rfqRepository.findById(existing.getRfqId())
                .orElseThrow(() -> new RuntimeException("Parent RFQ not found"));
        if (parentRFQ.getStatus() != RFQStatus.APPROVED) {
            throw new RuntimeException("Cannot resubmit RFP. Parent RFQ is not APPROVED.");
        }

        // Recalculate Budget validation excluding this RFP's old amount but including
        // new
        List<RFP> existingRFPs = rfpRepository.findByRfqId(existing.getRfqId());
        double usedBudget = existingRFPs.stream()
                .filter(r -> !r.getId().equals(id) && r.getStatus() != RFPStatus.REJECTED)
                .mapToDouble(RFP::getAmount)
                .sum();

        if (usedBudget + updatedRfp.getAmount() > parentRFQ.getTotalBudget()) {
            throw new RuntimeException("Updated RFP amount exceeds remaining RFQ budget.");
        }

        existing.setTitle(updatedRfp.getTitle());
        existing.setAmount(updatedRfp.getAmount());
        existing.setCustomData(updatedRfp.getCustomData());
        existing.setStatus(RFPStatus.PENDING_PM); // Reset to Pending
        existing.setRejectionReason(null); // Clear rejection
        existing.setCreatedAt(new Date()); // Refresh date? Or keep original? Let's refresh to bump it up.

        return rfpRepository.save(existing);
    }
}
