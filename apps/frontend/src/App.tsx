import { createBrowserRouter, RouterProvider, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import DashboardLayout from './components/dashboard/DashboardLayout';
import LandingPageSimple from './pages/LandingPageSimple';
import PublicTemplatesPage from './pages/PublicTemplatesPage';
import JobBoard from './pages/JobBoard';
import GoogleAuthCallback from './pages/auth/GoogleAuthCallback';
import GoogleAuthError from './pages/auth/GoogleAuthError';
import ResumeBuilder from './pages/resume-builder/ResumeBuilder';
import ComprehensiveResumeBuilder from './pages/resume-builder/ComprehensiveResumeBuilder';
import TemplateSelection from './pages/resume-builder/TemplateSelection';
import ResumePreviewPage from './pages/resume-builder/ResumePreviewPage';
import UploadResume from './pages/resume-builder/UploadResume';
import CoverLetterDashboard from './pages/cover-letter/CoverLetterDashboard';
import CoverLetterGenerator from './pages/cover-letter/CoverLetterGenerator';
import ConversationalCoverLetterPage from './pages/cover-letter/ConversationalCoverLetterPage';
import EditJobApplication from './pages/job-tracker/EditJobApplication';
import JobApplicationDetail from './pages/job-tracker/JobApplicationDetail';
import CreateJobApplication from './pages/job-tracker/CreateJobApplication';
import ApplicationAnalytics from './pages/job-tracker/ApplicationAnalytics';
import ResumeTrackingDashboard from './pages/job-tracker/ResumeTrackingDashboard';
import CareerCoachPage from './pages/career-coach/CareerCoachPage';
import InterviewScheduler from './pages/job-tracker/InterviewScheduler';
import ApiDebugInfo from './components/debug/ApiDebugInfo';
import NotificationTestPage from './pages/NotificationTestPage';
import AccountManager from './components/account/AccountManager';
import EnterpriseUpgrade from './pages/payment/EnterpriseUpgrade';
import PaymentSuccess from './pages/payment/PaymentSuccess';
import DashboardHome from './components/dashboard/DashboardHome';
import PublicJobView from './pages/PublicJobView';
import PublicResumeShareView from './pages/PublicResumeShareView';


import './utils/apiDebug'; // Load API debug tools


// Protected Route Component
function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  // If children are provided (like DashboardLayout), render them.
  // Otherwise render Outlet for nested routes.
  return children ? <>{children}</> : <Outlet />;
}

// Define and export routes array
const AppRoutes = [
  {
    path: "/",
    element: <Layout><LandingPageSimple /></Layout>
  },
  {
    path: "/templates",
    element: <Layout><PublicTemplatesPage /></Layout>
  },
  {
    path: "/jobs",
    element: <Layout><JobBoard /></Layout>
  },
  {
    path: "/jobs/:id/apply",
    element: <PublicJobView />
  },
  {
    path: "/share/r/:shareId",
    element: <PublicResumeShareView />
  },
  {
    path: "/auth/success",
    element: <GoogleAuthCallback />
  },
  {
    path: "/auth/error",
    element: <GoogleAuthError />
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>, // DashboardLayout wraps all dashboard child routes
    children: [
      { index: true, element: <DashboardHome /> }, // Default content for /dashboard
      
      // Resume Builder Routes
      { path: "resume", element: <ResumeBuilder /> },
      { path: "resume/templates", element: <TemplateSelection /> },
      { path: "resume/comprehensive", element: <ComprehensiveResumeBuilder /> },
      { path: "resume/upload", element: <UploadResume /> },
      { path: "resume/preview/:id", element: <ResumePreviewPage /> },
      { path: "resume/edit/:id", element: <ComprehensiveResumeBuilder /> },

      // Cover Letter Routes
      { path: "cover-letter", element: <CoverLetterDashboard /> },
      { path: "cover-letter/generator", element: <CoverLetterGenerator /> },
      { path: "cover-letter/conversational", element: <ConversationalCoverLetterPage /> },

      // Job Application Tracker Routes
      { path: "applications/new", element: <CreateJobApplication /> },
      { path: "applications/edit/:id", element: <EditJobApplication /> },
      { path: "applications/:id", element: <JobApplicationDetail /> },
      { path: "analytics", element: <ApplicationAnalytics /> },
      { path: "analytics/resume-tracking", element: <ResumeTrackingDashboard /> },
      { path: "coach", element: <CareerCoachPage /> },
      { path: "interviews", element: <InterviewScheduler /> },

      // Account & Payment Routes
      { path: "account", element: <AccountManager /> },
      { path: "upgrade", element: <EnterpriseUpgrade /> },
      { path: "payment-success", element: <PaymentSuccess /> },

      // Debugging
      { path: "debug", element: <ApiDebugInfo /> },
      { path: "notifications-test", element: <NotificationTestPage /> },

      // Job Board inside dashboard
      { path: "job-posting", element: <JobBoard /> }, 
    ]
  }
];

export default AppRoutes;