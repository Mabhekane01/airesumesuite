import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/authStore'
import { NotificationProvider } from './contexts/NotificationContext'
import { SearchProvider } from './contexts/SearchContext'
import Layout from './components/layout/Layout'
import DashboardLayout from './components/dashboard/DashboardLayout'
import LandingPageSimple from './pages/LandingPageSimple'
// Removed old verification pages - now using OTP-based verification
import './utils/apiDebug' // Load API debug tools

const queryClient = new QueryClient()

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="dark bg-dark-primary min-h-screen">
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <SearchProvider>
            <Router>
              <Routes>
                <Route 
                  path="/" 
                  element={isAuthenticated ? <Navigate to="/dashboard" replace /> : 
                    <Layout>
                      <LandingPageSimple />
                    </Layout>
                  } 
                />
                {/* Legacy verification routes removed - now using in-modal OTP verification */}
                <Route path="/dashboard/*" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                } />
              </Routes>
              <Toaster position="top-right" />
            </Router>
          </SearchProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App