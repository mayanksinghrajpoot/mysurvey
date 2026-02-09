package com.form.forms.controller;

import com.form.forms.model.RFP;
import com.form.forms.service.RFPService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rfps")
@CrossOrigin(origins = "*")
public class RFPController {

    @Autowired
    private RFPService rfpService;

    @PostMapping
    public ResponseEntity<?> createRFP(@RequestBody RFP rfp) {
        try {
            return ResponseEntity.ok(rfpService.createRFP(rfp));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/rfq/{rfqId}")
    public List<RFP> getRfpsByRfq(@PathVariable String rfqId) {
        return rfpService.getRFPsByRFQ(rfqId);
    }

    // PM: Get Pending RFPs for Project
    @GetMapping("/pending-pm/{projectId}")
    public List<RFP> getPendingRfpsForProject(@PathVariable String projectId) {
        return rfpService.getPendingRFPsForProject(projectId);
    }

    // PM: Approve
    @PutMapping("/{id}/approve-pm")
    public ResponseEntity<?> approveByPM(@PathVariable String id) {
        try {
            return ResponseEntity.ok(rfpService.approveByPM(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Admin: Get Pending Approvals
    @GetMapping("/pending-admin")
    public List<RFP> getPendingAdmin() {
        return rfpService.getPendingAdminApprovals();
    }

    // Admin: Approve
    @PutMapping("/{id}/approve-admin")
    public ResponseEntity<?> approveByAdmin(@PathVariable String id) {
        try {
            return ResponseEntity.ok(rfpService.approveByAdmin(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    public RFP rejectRFP(@PathVariable String id, @RequestBody Map<String, String> body) {
        return rfpService.rejectRFP(id, body.get("reason"));
    }
}
