import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SurveyCreatorWidget from './components/SurveyCreatorWidget';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import SurveyRunner from './components/SurveyRunner';
import SurveyResponses from './components/SurveyResponses';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import AdminDashboard from './components/AdminDashboard';
import ProjectManagerDashboard from './components/ProjectManagerDashboard';
import NgoDashboard from './components/NgoDashboard';
import ProjectList from './components/views/ProjectList';
import ProjectDetailView from './components/views/ProjectDetailView';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            <Route path="/super-admin" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}><SuperAdminDashboard /></ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/pm" element={
              <ProtectedRoute roles={['PROJECT_MANAGER']}><ProjectManagerDashboard /></ProtectedRoute>
            } />

            <Route path="/ngo" element={
              <ProtectedRoute roles={['NGO']}><NgoDashboard /></ProtectedRoute>
            } />

            <Route path="/projects" element={
              <ProtectedRoute><ProjectList /></ProtectedRoute>
            } />

            <Route path="/projects/:id" element={
              <ProtectedRoute><ProjectDetailView /></ProtectedRoute>
            } />

            <Route path="/create-survey" element={
              <ProtectedRoute roles={['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN']}><SurveyCreatorWidget /></ProtectedRoute>
            } />

            <Route path="/surveys/:id/responses" element={
              <ProtectedRoute><SurveyResponses /></ProtectedRoute>
            } />

            <Route path="/surveys/:id/analytics" element={
              <ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>
            } />

            <Route path="/survey/:id" element={<SurveyRunner />} />

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
        <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;