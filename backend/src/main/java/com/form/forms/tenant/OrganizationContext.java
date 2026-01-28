package com.form.forms.tenant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrganizationContext {
    private static final Logger logger = LoggerFactory.getLogger(OrganizationContext.class);
    private static final ThreadLocal<String> currentOrganization = new ThreadLocal<>();

    public static void setOrganizationId(String organizationId) {
        logger.debug("Setting organizationId to {}", organizationId);
        currentOrganization.set(organizationId);
    }

    public static String getOrganizationId() {
        return currentOrganization.get();
    }

    public static void clear() {
        currentOrganization.remove();
    }
}
