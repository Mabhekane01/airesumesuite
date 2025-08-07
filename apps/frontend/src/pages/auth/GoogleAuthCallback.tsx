import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNotifications } from '../../contexts/NotificationContext';

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, refreshUserProfile, redirectAfterLogin, setRedirectAfterLogin } = useAuthStore();
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh');
        const sessionId = searchParams.get('sessionId');
        const error = searchParams.get('message');
        const redirectUrl = searchParams.get('redirect');

        if (error) {
          console.error('Google Auth error:', error);
          navigate('/?auth=error&message=' + encodeURIComponent(error));
          return;
        }

        if (!token || !refreshToken) {
          console.error('Missing tokens in callback');
          navigate('/?auth=error&message=missing_tokens');
          return;
        }

        // Set tokens first
        setTokens(token, refreshToken);

        // Refresh user profile to get user data
        await refreshUserProfile();

        // Add a small delay before refreshing notifications to ensure backend notification is created
        setTimeout(() => {
          refreshNotifications();
        }, 1000);

        console.log('✅ Google OAuth login successful');
        
        // Check for redirect URL from store or callback parameter
        const finalRedirectUrl = redirectUrl || redirectAfterLogin;
        
        if (finalRedirectUrl) {
          console.log('🔄 Redirecting to:', finalRedirectUrl);
          setRedirectAfterLogin(null); // Clear the redirect URL
          navigate(finalRedirectUrl, { replace: true });
        } else {
          // Default redirect to templates page (more comprehensive than dashboard)
          navigate('/templates', { replace: true });
        }
        
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        navigate('/?auth=error&message=callback_error');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setTokens, refreshUserProfile, redirectAfterLogin, setRedirectAfterLogin, refreshNotifications]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-accent-primary rounded-full opacity-20 animate-float-gentle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="relative glass-dark rounded-xl shadow-dark-xl p-8 max-w-md w-full text-center animate-slide-up-soft">
        {/* Google icon with glow effect */}
        <div className="mb-6 relative">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center border border-white/10 backdrop-blur-sm shadow-glow-md">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          
          {/* Floating sparkles */}
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-accent-primary rounded-full animate-pulse opacity-60"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent-secondary rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Loading animation */}
        <div className="mb-6">
          <div className="w-12 h-12 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-primary animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-accent-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold gradient-text-dark">
            Completing Sign In ✨
          </h2>
          <p className="text-dark-text-secondary">
            Please wait while we complete your Google sign-in and set up your account...
          </p>
        </div>

        {/* Progress indicators */}
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-center space-x-2 text-sm text-dark-text-tertiary">
            <svg className="h-4 w-4 text-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Authenticating with Google</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-dark-text-tertiary">
            <div className="w-4 h-4 border border-accent-primary rounded-full animate-pulse"></div>
            <span>Setting up your profile</span>
          </div>
        </div>
      </div>
    </div>
  );
}