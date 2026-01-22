import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SurveyCreatorWidget from './components/SurveyCreatorWidget';
import AdminDashboard from './components/AdminDashboard';
import SurveyRunner from './components/SurveyRunner';
import SurveyResponses from './components/SurveyResponses';
import AnalyticsDashboard from './components/AnalyticsDashboard';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/create-survey" element={
          <ProtectedRoute><SurveyCreatorWidget /></ProtectedRoute>
        } />
        <Route path="/surveys/:id/responses" element={
          <ProtectedRoute><SurveyResponses /></ProtectedRoute>
        } />
        <Route path="/admin-dashboard" element={
          <ProtectedRoute><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/surveys/:id/analytics" element={
          <ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>
        } />
        <Route path="/survey/:id" element={<SurveyRunner />} /> {/* Public access */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;