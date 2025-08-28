import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useAuthStore } from "./stores/authStore";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SearchProvider } from "./contexts/SearchContext";
import Layout from "./components/layout/Layout";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import LandingPageSimple from "./pages/LandingPageSimple";
import PublicTemplatesPage from "./pages/PublicTemplatesPage";
import PDFEditorPage from "./pages/PDFEditorPage";
import DocumentManagerApp from "./components/document-manager/DocumentManagerApp";
import DocTrackerLandingPage from "./pages/DocTrackerLandingPage";
import GoogleAuthCallback from "./pages/auth/GoogleAuthCallback";
import GoogleAuthError from "./pages/auth/GoogleAuthError";
import AccountPage from "./pages/AccountPage";
// Removed old verification pages - now using OTP-based verification
import "./utils/apiDebug"; // Load API debug tools

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="dark bg-gray-900 min-h-screen">
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <SearchProvider>
            <Router>
              <Routes>
                <Route
                  path="/"
                  element={
                    isAuthenticated ? (
                      <Navigate to="/templates" replace />
                    ) : (
                      <Layout>
                        <LandingPageSimple />
                      </Layout>
                    )
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <Layout>
                      <PublicTemplatesPage />
                    </Layout>
                  }
                />
                <Route
                  path="/pdf-editor"
                  element={
                    <Layout>
                      <PDFEditorPage />
                    </Layout>
                  }
                />
                <Route
                  path="/document-manager"
                  element={
                    <Layout>
                      {isAuthenticated ? (
                        <DocumentManagerApp />
                      ) : (
                        <DocTrackerLandingPage />
                      )}
                    </Layout>
                  }
                />
                {/* Google OAuth callback routes */}
                <Route path="/auth/success" element={<GoogleAuthCallback />} />
                <Route path="/auth/error" element={<GoogleAuthError />} />
                {/* Account page - separate from dashboard */}
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <AccountPage />
                    </ProtectedRoute>
                  }
                />
                {/* Legacy verification routes removed - now using in-modal OTP verification */}
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <Toaster
                position="top-right"
                theme="dark"
                richColors
                closeButton
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                  },
                }}
              />
            </Router>
          </SearchProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
