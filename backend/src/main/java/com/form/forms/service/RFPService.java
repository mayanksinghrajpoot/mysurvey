package com.form.forms.service;

import com.form.forms.model.RFP;
import com.form.forms.model.RFPStatus;
import com.form.forms.model.RFQ;
import com.form.forms.model.RFQStatus;
import com.form.forms.repository.RFPRepository;
import com.form.forms.repository.RFQRepository;
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

    // Retrieve Pending RFPs for Admin
    public List<RFP> getPendingAdminApprovals() {
        return rfpRepository.findAll().stream()
                .filter(r -> r.getStatus() == RFPStatus.PENDING_ADMIN)
                .collect(Collectors.toList());
    }
}
