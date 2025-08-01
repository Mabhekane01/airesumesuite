@echo off
echo Building frontend for production...

set VITE_NODE_ENV=production
set VITE_APP_NAME=AI Job Suite
set VITE_APP_VERSION=1.0.0
set VITE_API_BASE_URL=https://airesumesuite.onrender.com/api/v1
set VITE_APP_URL=https://airesumesuite.web.app
set VITE_GOOGLE_CLIENT_ID=202022666226-ahhpa9jc4e8cka53h0bv52pqs2tpqohn.apps.googleusercontent.com
set VITE_RECAPTCHA_SITE_KEY=6LfkOJQrAAAAAGfteUzaGCwQihtZoz1O221RSXs1
set VITE_GA_TRACKING_ID=G-Y4CHQRKG7R
set VITE_PAYSTACK_PUBLISHABLE_KEY=pk_test_40ddd9743e90fcd42000a071259b80713833f6e4
set VITE_ENABLE_AI_FEATURES=true
set VITE_ENABLE_PAYMENT_PROCESSING=true
set VITE_ENABLE_ANALYTICS=true
set VITE_ENABLE_RECAPTCHA=true
set VITE_ENABLE_GOOGLE_AUTH=true
set VITE_DEBUG_MODE=false
set VITE_LOG_LEVEL=error
set VITE_SENTRY_DSN=https://e5cfaa159c3404393d2aa5ff5ab2d7ad@o4509756801351680.ingest.de.sentry.io/4509756804038736
set VITE_ENABLE_PWA=true

npm run build
firebase deploy