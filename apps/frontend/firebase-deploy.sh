#!/bin/bash

echo "Building frontend for production with environment variables..."

export VITE_NODE_ENV=production
export VITE_APP_NAME="AI Job Suite"
export VITE_APP_VERSION=1.0.0
export VITE_API_BASE_URL=https://airesumesuite.onrender.com/api/v1
export VITE_APP_URL=https://airesumesuite.web.app
export VITE_GOOGLE_CLIENT_ID=202022666226-ahhpa9jc4e8cka53h0bv52pqs2tpqohn.apps.googleusercontent.com
export VITE_RECAPTCHA_SITE_KEY=6LfkOJQrAAAAAGfteUzaGCwQihtZoz1O221RSXs1
export VITE_GA_TRACKING_ID=G-Y4CHQRKG7R
export VITE_PAYSTACK_PUBLISHABLE_KEY=pk_test_40ddd9743e90fcd42000a071259b80713833f6e4
export VITE_ENABLE_AI_FEATURES=true
export VITE_ENABLE_PAYMENT_PROCESSING=true
export VITE_ENABLE_ANALYTICS=true
export VITE_ENABLE_RECAPTCHA=true
export VITE_ENABLE_GOOGLE_AUTH=true
export VITE_DEBUG_MODE=false
export VITE_LOG_LEVEL=error
export VITE_SENTRY_DSN=https://e5cfaa159c3404393d2aa5ff5ab2d7ad@o4509756801351680.ingest.de.sentry.io/4509756804038736
export VITE_ENABLE_PWA=true

npm run build
firebase deploy