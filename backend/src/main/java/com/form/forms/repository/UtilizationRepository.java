package com.form.forms.repository;

import com.form.forms.model.Utilization;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface UtilizationRepository extends MongoRepository<Utilization, String> {
    List<Utilization> findByRfpId(String rfpId);

    List<Utilization> findByNgoId(String ngoId);

    // Bulk fetch for Dashboard
    List<Utilization> findByRfpIdIn(List<String> rfpIds);
}
