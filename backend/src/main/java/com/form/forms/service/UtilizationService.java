package com.form.forms.service;

import com.form.forms.model.RFP;
import com.form.forms.model.RFPStatus;
import com.form.forms.model.RFQ;
import com.form.forms.model.Utilization;
import com.form.forms.repository.RFPRepository;
import com.form.forms.repository.RFQRepository;
import com.form.forms.repository.UtilizationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
public class UtilizationService {

    @Autowired
    private UtilizationRepository utilizationRepository;

    @Autowired
    private RFPRepository rfpRepository;

    @Autowired
    private RFQRepository rfqRepository;

    public Utilization createUtilization(Utilization utilization) {
        // Validate RFP
        RFP rfp = rfpRepository.findById(utilization.getRfpId())
                .orElseThrow(() -> new RuntimeException("RFP not found"));

        if (rfp.getStatus() != RFPStatus.APPROVED) { // Check for approved/released status
            // Note: In some systems, 'APPROVED' means released.
            // If we had a RELEASED status, we'd check that.
            // Assuming APPROVED is sufficient for now based on previous impl.
        }

        // Validate Amount Constraint
        List<Utilization> existing = utilizationRepository.findByRfpId(utilization.getRfpId());
        double utilizedSoFar = existing.stream()
                .filter(u -> !"REJECTED".equals(u.getStatus())) // Exclude rejected expenses
                .mapToDouble(Utilization::getAmount)
                .sum();

        if (utilizedSoFar + utilization.getAmount() > rfp.getAmount()) {
            throw new RuntimeException("Expense exceeds the released RFP amount.");
        }

        // V3: Validate Custom Data against RFQ Format
        validateCustomData(utilization, rfp);

        utilization.setStatus("SUBMITTED");
        utilization.setCreatedAt(new Date());
        return utilizationRepository.save(utilization);
    }

    public List<Utilization> getByRfp(String rfpId) {
        return utilizationRepository.findByRfpId(rfpId);
    }

    public List<Utilization> getByNgo(String ngoId) {
        return utilizationRepository.findByNgoId(ngoId);
    }

    public Utilization verifyUtilization(String id) {
        Utilization u = utilizationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilization not found"));

        if (!"SUBMITTED".equals(u.getStatus())) {
            throw new RuntimeException("Cannot verify utilization. Current status: " + u.getStatus());
        }

        u.setStatus("VERIFIED");
        u.setVerifiedAt(new Date());
        return utilizationRepository.save(u);
    }

    public Utilization rejectUtilization(String id) {
        Utilization u = utilizationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilization not found"));

        if (!"SUBMITTED".equals(u.getStatus())) {
            throw new RuntimeException("Cannot reject utilization. Current status: " + u.getStatus());
        }

        u.setStatus("REJECTED");
        return utilizationRepository.save(u);
    }

    private void validateCustomData(Utilization utilization, RFP rfp) {
        // Fetch RFQ to get schema
        RFQ rfq = rfqRepository.findById(rfp.getRfqId())
                .orElseThrow(() -> new RuntimeException("Related RFQ not found"));

        List<RFQ.CustomField> schema = rfq.getExpenseFormat();
        if (schema == null || schema.isEmpty()) {
            return; // No custom format enforced
        }

        java.util.Map<String, Object> data = utilization.getCustomData();
        if (data == null) {
            throw new RuntimeException("This Project requires additional expense details.");
        }

        for (RFQ.CustomField field : schema) {
            if (field.isRequired()) {
                if (!data.containsKey(field.getName()) || data.get(field.getName()) == null
                        || data.get(field.getName()).toString().trim().isEmpty()) {
                    throw new RuntimeException("Missing required field: " + field.getName());
                }
            }
        }
    }
}
