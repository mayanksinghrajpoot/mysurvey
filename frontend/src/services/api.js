import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        const organizationId = localStorage.getItem('organizationId');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (organizationId || localStorage.getItem('impersonateTenantId')) {
            const effectiveTenantId = localStorage.getItem('impersonateTenantId') || organizationId;
            if (config.headers['X-ORGANIZATION-ID'] === undefined && effectiveTenantId) {
                config.headers['X-ORGANIZATION-ID'] = effectiveTenantId;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle Toast Notifications
        const expectedError = error.response && error.response.status >= 400 && error.response.status < 500;
        const serverError = error.response && error.response.status >= 500;

        if (expectedError || serverError) {
            let message = error.response.data?.message || (typeof error.response.data?.error === 'string' ? error.response.data.error : JSON.stringify(error.response.data?.error)) || "An unexpected error occurred";

            // If we have field-specific validation errors, append them
            const fieldErrors = error.response.data?.errors;
            if (fieldErrors && typeof fieldErrors === 'object') {
                const detailedErrors = Object.entries(fieldErrors)
                    .map(([field, msg]) => `\n- ${field}: ${msg}`)
                    .join('');
                if (detailedErrors) {
                    message += `:${detailedErrors}`;
                }
            }
            toast.error(message, { style: { whiteSpace: 'pre-line' } }); // Use pre-line to respect newlines
        } else if (error.code === 'ERR_NETWORK') {
            toast.error("Network error. Is the backend running?");
        } else {
            toast.error("An unexpected error occurred");
        }

        // Handle Auth Redirects
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Don't redirect if it's a login attempt failing (we want to show the error message)
            if (!error.config.url.includes('/auth/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('tenantId');
                // Optional: Force reload to clear state or redirect
                if (error.response.status === 401) {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
