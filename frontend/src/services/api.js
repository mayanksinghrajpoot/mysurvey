import axios from 'axios';

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

        if (organizationId && config.headers['X-ORGANIZATION-ID'] === undefined) {
            config.headers['X-ORGANIZATION-ID'] = organizationId;
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
