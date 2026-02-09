package com.form.forms.repository;

import com.form.forms.model.RFP;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RFPRepository extends MongoRepository<RFP, String> {

    // List all RFPs belonging to a specific RFQ
    List<RFP> findByRfqId(String rfqId);

    // List all RFPs submitted by an NGO (generic view)
    List<RFP> findByNgoId(String ngoId);

    // Bulk fetch for Dashboard
    List<RFP> findByRfqIdIn(List<String> rfqIds);
}
