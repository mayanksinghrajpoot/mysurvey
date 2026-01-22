import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        const tenantId = localStorage.getItem('tenantId'); // Or parse from token, but header is good validation

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // In a real multi-tenant app, tenant might be inferred from subdomain (e.g., ngo1.app.com)
        // For this demo, we store it manually or let the user "select" it (login context)
        // We will extract it from the JWT in backend mostly, but sending it in header helps filter before parsing token
        // We will extract it from the JWT in backend mostly, but sending it in header helps filter before parsing token
        if (tenantId && config.headers['X-TENANT-ID'] === undefined) {
            config.headers['X-TENANT-ID'] = tenantId;
        }

        return config;
    },
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Don't redirect if it's a login attempt failing (we want to show the error message)
            if (!error.config.url.includes('/auth/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('tenantId');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
