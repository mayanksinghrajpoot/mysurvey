package com.form.forms.controller;

import com.form.forms.model.RFQ;
import com.form.forms.service.RFQService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rfqs")
public class RFQController {

    @Autowired
    private RFQService rfqService;

    // NGO: Create RFQ
    @PostMapping
    public ResponseEntity<?> createRFQ(@RequestBody RFQ rfq) {
        try {
            return ResponseEntity.ok(rfqService.createRFQ(rfq));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // NGO: Get My RFQ (Single per project)
    @GetMapping("/my-rfq")
    public ResponseEntity<?> getMyRfq(@RequestParam String projectId, @RequestParam String ngoId) {
        return rfqService.getRFQByProjectAndNgo(projectId, ngoId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // PM: Get RFQs for my Project
    @GetMapping("/project/{projectId}")
    public List<RFQ> getProjectRfqs(@PathVariable String projectId) {
        return rfqService.getRFQsByProject(projectId);
    }

    // PM/Admin: Get specific RFQ
    @GetMapping("/{id}")
    public ResponseEntity<RFQ> getRfqById(@PathVariable String id) {
        return ResponseEntity.ok(rfqService.getRFQById(id));
    }

    // PM: Approve
    @SuppressWarnings("unchecked")
    @PutMapping("/{id}/approve-pm")
    public ResponseEntity<?> approveByPM(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            List<Map<String, Object>> formatMap = (List<Map<String, Object>>) (body != null ? body.get("expenseFormat")
                    : null);
            return ResponseEntity.ok(rfqService.approveByPM(id, formatMap));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Admin: Get Pending Approvals
    @GetMapping("/pending-admin")
    public List<RFQ> getPendingAdmin() {
        return rfqService.getPendingAdminApprovals();
    }

    // Admin: Approve
    @PutMapping("/{id}/approve-admin")
    public ResponseEntity<?> approveByAdmin(@PathVariable String id) {
        try {
            return ResponseEntity.ok(rfqService.approveByAdmin(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Joint: Reject
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectRFQ(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(rfqService.rejectRFQ(id, body.get("reason")));
    }
}
