import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LoginFormSimple from '../../components/auth/LoginFormSimple';
import RegisterForm from '../../components/auth/RegisterForm';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (isAuthenticated) {
      const storedRedirect = localStorage.getItem('redirectAfterLogin');
      
      // Prevent redirect loops and default to dashboard if no stored redirect or if stored redirect is login/root
      let targetPath = storedRedirect && storedRedirect !== '/login' && storedRedirect !== '/' 
        ? storedRedirect 
        : '/dashboard';
      
      localStorage.removeItem('redirectAfterLogin');
      navigate(targetPath);
    }
  }, [isAuthenticated, navigate]);

  const handleSuccess = () => {
    // The useEffect above will handle the redirect when isAuthenticated becomes true
    // But we can also force it here to be instant
    const storedRedirect = localStorage.getItem('redirectAfterLogin');
    let targetPath = storedRedirect && storedRedirect !== '/login' && storedRedirect !== '/' 
        ? storedRedirect 
        : '/dashboard';
        
    localStorage.removeItem('redirectAfterLogin');
    navigate(targetPath);
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center p-4 relative overflow-hidden">
       {/* Background Decoration */}
       <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl mix-blend-multiply animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="flex justify-center mb-8">
           <Link to="/" className="group flex items-center gap-3">
              <span className="text-2xl font-display font-black text-brand-dark tracking-tight">
                JobSuite
              </span>
            </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-surface-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-8 md:p-12"
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginFormSimple
                  onToggleMode={toggleMode}
                  onClose={() => navigate('/')} // Close returns to home
                  onSuccess={handleSuccess}
                />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterForm
                  onToggleMode={toggleMode}
                  onClose={() => navigate('/')}
                  onSuccess={handleSuccess}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <div className="text-center mt-8 text-text-tertiary text-xs font-medium">
          &copy; {new Date().getFullYear()} JobSuite Intelligence. All systems operational.
        </div>
      </div>
    </div>
  );
}
