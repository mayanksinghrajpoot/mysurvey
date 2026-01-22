import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('New NGO');
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('password');
    const [role, setRole] = useState('USER');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (isRegistering) {
                // Register
                await api.post('/auth/register', { name, username, password, role });
                setSuccess('Registration successful! Please login.');
                setIsRegistering(false);
            } else {
                // Login
                const response = await api.post('/auth/login', { username, password });
                const { token } = response.data;

                localStorage.setItem('token', token);

                // Decode JWT to get tenantId and role
                const payload = JSON.parse(atob(token.split('.')[1]));
                localStorage.setItem('tenantId', payload.tenantId);
                localStorage.setItem('tenantName', username);
                localStorage.setItem('role', payload.role);

                if (payload.role === 'ADMIN') {
                    navigate('/admin-dashboard');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error;
            if (isRegistering) {
                setError(msg || 'Registration failed. Username might be taken.');
            } else {
                setError(msg || 'Login failed. Check credentials or register first.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-gray-500 mt-2">
                        {isRegistering ? 'Sign up to create powerful surveys' : 'Login to manage your forms'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {isRegistering && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    placeholder="E.g. Acme Corp"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                >
                                    <option value="USER">NGO</option>
                                    <option value="ADMIN">System Admin</option>
                                </select>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition duration-200 transform hover:-translate-y-0.5"
                    >
                        {isRegistering ? 'Get Started' : 'Sign In'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        {success}
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-gray-500">
                    {isRegistering ? "Already have an account? " : "Don't have an account? "}
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition"
                    >
                        {isRegistering ? 'Login here' : 'Create account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
