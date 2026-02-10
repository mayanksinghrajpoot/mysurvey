import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({
                        id: decoded.userId || decoded.id, // Try both
                        username: decoded.sub,
                        role: decoded.role,
                        organizationId: decoded.organizationId
                    });
                }
            } catch (error) {
                console.error("Invalid token:", error);
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setUser({
            id: decoded.userId || decoded.id,
            username: decoded.sub,
            role: decoded.role,
            organizationId: decoded.organizationId
        });
        if (decoded.organizationId) {
            localStorage.setItem('organizationId', decoded.organizationId);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('organizationId');
        localStorage.removeItem('impersonateTenantId'); // Clear impersonation if active
        setUser(null);
        window.location.href = '/login'; // Redirect to login page
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
