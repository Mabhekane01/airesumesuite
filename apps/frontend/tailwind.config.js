/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Dark theme colors - Apple-style gray glassmorphism
        dark: {
          primary: '#111827',    // gray-900
          secondary: '#1f2937',  // gray-800
          tertiary: '#374151',   // gray-700
          quaternary: '#4b5563', // gray-600
          border: '#6b7280',     // gray-500
          text: {
            primary: '#ffffff',
            secondary: '#e5e5e5',
            tertiary: '#b3b3b3',
            muted: '#808080',
          }
        },
        // Accent colors - emerald/teal theme
        accent: {
          primary: '#10b981',    // emerald-500
          secondary: '#14b8a6',  // teal-500  
          tertiary: '#059669',   // emerald-600
          quaternary: '#f59e0b', // Amber
          danger: '#ef4444',     // Red
          success: '#22c55e',    // Green
        },
        // Glass morphism colors - gray based
        glass: {
          light: 'rgba(156, 163, 175, 0.1)',   // gray-400 with opacity
          medium: 'rgba(156, 163, 175, 0.15)', // gray-400 with opacity
          heavy: 'rgba(156, 163, 175, 0.2)',   // gray-400 with opacity
        }
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #111827 0%, #374151 50%, #1f2937 100%)',
        'gradient-accent': 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #059669 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'float-gentle': 'float-gentle 6s ease-in-out infinite',
        'slide-up-soft': 'slide-up-soft 0.4s ease-out',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(16, 185, 129, 0.3)',
        'glow-md': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-lg': '0 0 30px rgba(16, 185, 129, 0.5)',
        'dark-lg': '0 10px 25px -3px rgba(17, 24, 39, 0.5), 0 4px 6px -2px rgba(17, 24, 39, 0.3)',
        'dark-xl': '0 20px 40px -4px rgba(17, 24, 39, 0.6), 0 8px 16px -4px rgba(17, 24, 39, 0.4)',
      }
    },
  },
  plugins: [],
}