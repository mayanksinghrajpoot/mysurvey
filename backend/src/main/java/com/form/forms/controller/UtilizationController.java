package com.form.forms.controller;

import com.form.forms.model.Utilization;
import com.form.forms.service.UtilizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/utilizations")
public class UtilizationController {

    @Autowired
    private UtilizationService utilizationService;

    @PostMapping
    public ResponseEntity<?> createUtilization(@RequestBody Utilization utilization) {
        try {
            return ResponseEntity.ok(utilizationService.createUtilization(utilization));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/rfp/{rfpId}")
    public List<Utilization> getByRfp(@PathVariable String rfpId) {
        return utilizationService.getByRfp(rfpId);
    }

    @GetMapping("/ngo/{ngoId}")
    public List<Utilization> getByNgo(@PathVariable String ngoId) {
        return utilizationService.getByNgo(ngoId);
    }

    @PutMapping("/{id}/verify")
    public ResponseEntity<?> verifyUtilization(@PathVariable String id) {
        try {
            return ResponseEntity.ok(utilizationService.verifyUtilization(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectUtilization(@PathVariable String id) {
        try {
            return ResponseEntity.ok(utilizationService.rejectUtilization(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
