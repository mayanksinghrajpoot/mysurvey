package com.form.forms.repository;

import com.form.forms.model.RFQ;
import com.form.forms.model.RFQStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface RFQRepository extends MongoRepository<RFQ, String> {

    // For constraint check: One RFQ per NGO per Project
    boolean existsByProjectIdAndNgoId(String projectId, String ngoId);

    // For NGO Dashboard: Find their specific RFQ for a project
    Optional<RFQ> findByProjectIdAndNgoId(String projectId, String ngoId);

    // For PM Dashboard: Find all RFQs in their project
    List<RFQ> findByProjectId(String projectId);

    // For Admin Dashboard: Find all pending final approvals
    List<RFQ> findByStatus(RFQStatus status);

    // Generic list by NGO
    List<RFQ> findByNgoId(String ngoId);

    // For PM Dashboard Optimization
    List<RFQ> findByProjectIdInAndStatus(List<String> projectIds, RFQStatus status);
}
