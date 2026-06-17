import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import { store } from './store';

// Layout & Guards
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeForm from './pages/EmployeeForm';
import PayrollProcess from './pages/PayrollProcess';
import InventoryList from './pages/InventoryList';
import ProjectsList from './pages/ProjectsList';
import InterviewsList from './pages/InterviewsList';
import Interviews from './pages/Interviews';
import InterviewCalendar from './pages/InterviewCalendar';
import CandidateDetail from './pages/CandidateDetail';
import Candidates from './pages/Candidates';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
// import Leads from './pages/Leads';
import InterviewFeedback from './pages/InterviewFeedback';
import UserManagement from './pages/UserManagement';
import FirstLoginModal from './components/auth/FirstLoginModal';


// App css imports
import './App.css';

const AppThemeWrapper = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f46e5', // Brand Indigo/Violet
          colorSuccess: '#10B981', // Green
          colorWarning: '#F59E0B', // Amber
          colorError: '#EF4444', // Red
          borderRadius: 16, // Rounded corners
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgBase: isDarkMode ? '#12102e' : '#ffffff',
          colorBgLayout: isDarkMode ? '#0c0a24' : '#eaeaf8', // Lavender Layout Background
        },
        components: {
          Table: {
            headerBg: isDarkMode ? '#1c1942' : '#f8f8fc',
            headerColor: isDarkMode ? '#94a3b8' : '#64748b',
            headerSplitColor: 'transparent',
            rowHoverBg: 'rgba(79, 70, 229, 0.04)',
            cellPaddingBlock: 16,
          },
          Card: {
            colorBorderSecondary: 'transparent',
            boxShadowTertiary: '0 10px 30px -10px rgba(79, 70, 229, 0.08)',
          },
          Menu: {
            itemActiveBg: 'transparent',
            itemSelectedBg: isDarkMode ? '#1e1b4b' : '#ffffff',
            itemSelectedColor: isDarkMode ? '#a5b4fc' : '#4f46e5',
            itemColor: '#64748b',
            itemHoverBg: 'rgba(79, 70, 229, 0.04)',
            itemHoverColor: '#4f46e5',
            itemBorderRadius: 12,
          }
        }
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <>
                    <FirstLoginModal />
                    <MainLayout />
                  </>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={
                <ProtectedRoute allowedRoles={['Admin', 'Interviewee', 'Job Hunter', 'Both']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="employees" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <EmployeeList />
                </ProtectedRoute>
              } />
              <Route path="employees/new" element={
                <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                  <EmployeeForm />
                </ProtectedRoute>
              } />
              <Route path="employees/edit/:id" element={
                <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                  <EmployeeForm />
                </ProtectedRoute>
              } />
              
              <Route path="payroll" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <PayrollProcess />
                </ProtectedRoute>
              } />
              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <InventoryList />
                </ProtectedRoute>
              } />
              <Route path="projects" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <ProjectsList />
                </ProtectedRoute>
              } />
              <Route path="recruitment" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <InterviewsList />
                </ProtectedRoute>
              } />
              <Route path="interviews" element={<Interviews />} />
              <Route path="interviews/calendar" element={<InterviewCalendar />} />
              <Route path="interviews/candidates/:name" element={<CandidateDetail />} />
              <Route path="interviews/feedback" element={<InterviewFeedback />} />
              <Route path="candidates" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <Candidates />
                </ProtectedRoute>
              } />
              {/* <Route path="leads" element={<Leads />} /> */}
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['Admin', 'HR', 'Manager']}>
                  <Reports />
                </ProtectedRoute>
              } />
              
              <Route path="user-management" element={
                <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                  <UserManagement />
                </ProtectedRoute>
              } />

              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <Provider store={store}>
      <AppThemeWrapper />
    </Provider>
  );
}

export default App;
