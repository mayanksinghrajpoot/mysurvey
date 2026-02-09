package com.form.forms.controller;

import com.form.forms.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/ngo/summary")
    public ResponseEntity<Map<String, Object>> getNgoDashboardSummary(@RequestParam String ngoId) {
        return ResponseEntity.ok(dashboardService.getNgoDashboardSummary(ngoId));
    }

    @GetMapping("/pm/details/{pmId}")
    public ResponseEntity<Map<String, Object>> getPmDashboardDetail(@PathVariable String pmId) {
        return ResponseEntity.ok(dashboardService.getPmDashboardDetail(pmId));
    }
}
