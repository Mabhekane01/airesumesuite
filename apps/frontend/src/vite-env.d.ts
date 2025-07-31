/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Application Configuration
  readonly VITE_NODE_ENV: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DESCRIPTION: string
  
  // API Configuration
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_URL: string
  
  // Google Services
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_RECAPTCHA_SITE_KEY: string
  readonly VITE_GA_TRACKING_ID: string
  
  // External API Services
  readonly VITE_IPGEOLOCATION_API_KEY: string
  readonly VITE_FIXER_API_KEY: string
  readonly VITE_CURRENCYAPI_KEY: string
  
  // Payment Processing
  readonly VITE_PAYSTACK_PUBLISHABLE_KEY: string
  
  // Feature Flags
  readonly VITE_ENABLE_AI_FEATURES: string
  readonly VITE_ENABLE_PAYMENT_PROCESSING: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_RECAPTCHA: string
  readonly VITE_ENABLE_GOOGLE_AUTH: string
  
  // Development Settings
  readonly VITE_DEBUG_MODE: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_MOCK_DATA: string
  
  // Branding & Theming
  readonly VITE_PRIMARY_COLOR: string
  readonly VITE_SECONDARY_COLOR: string
  readonly VITE_BRAND_NAME: string
  readonly VITE_SUPPORT_EMAIL: string
  
  // Social Media & SEO
  readonly VITE_META_TITLE: string
  readonly VITE_META_DESCRIPTION: string
  readonly VITE_META_KEYWORDS: string
  readonly VITE_META_IMAGE: string
  
  // CDN & Assets
  readonly VITE_CDN_BASE_URL: string
  readonly VITE_ASSETS_BASE_URL: string
  
  // Monitoring & Analytics
  readonly VITE_SENTRY_DSN: string
  readonly VITE_HOTJAR_ID: string
  readonly VITE_MIXPANEL_TOKEN: string
  
  // Social Media Integration
  readonly VITE_FACEBOOK_PIXEL_ID: string
  readonly VITE_LINKEDIN_PARTNER_ID: string
  readonly VITE_TWITTER_PIXEL_ID: string
  
  // Performance & Optimization
  readonly VITE_ENABLE_PWA: string
  readonly VITE_ENABLE_SERVICE_WORKER: string
  readonly VITE_CACHE_STRATEGY: string
  
  // Security Headers
  readonly VITE_CSP_REPORT_URI: string
  readonly VITE_SECURITY_CONTACT: string
  
  // Third-party Integrations
  readonly VITE_INTERCOM_APP_ID: string
  readonly VITE_ZENDESK_KEY: string
  readonly VITE_MAILCHIMP_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}