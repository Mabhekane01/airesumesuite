export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      ai_actions: 5, // Limited AI (summary only)
      resume_exports: 1, // 1 basic resume
      watermark: true,
    },
    features: [
      'Basic Resume Template',
      'Manual Editing',
      'Limited AI Summary',
      'Watermarked PDF Export'
    ]
  },
  pro: {
    name: 'Pro',
    price: 99, // R99/month (example)
    limits: {
      ai_actions: 100, // Generous limit for personal use
      resume_exports: 10,
      watermark: false,
    },
    features: [
      'Tailored CV per Job',
      'Cover Letter Generation',
      'ATS Optimization',
      'Job Matching Analysis',
      'No Watermark'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 499, // Custom/Higher pricing
    limits: {
      ai_actions: 1000,
      resume_exports: 100,
      watermark: false,
    },
    features: [
      'Bulk Credits',
      'White-label Access',
      'Team Dashboards',
      'Priority Support'
    ]
  }
};

export const CREDIT_PACKAGES = [
  { credits: 5, price: 50, currency: 'ZAR' },
  { credits: 15, price: 120, currency: 'ZAR' },
  { credits: 50, price: 350, currency: 'ZAR' }
];

export const AI_COSTS = {
  summary_generation: 1,
  bullet_point_enhancement: 1,
  cover_letter_generation: 2,
  ats_analysis: 2,
  job_tailoring: 3
};
