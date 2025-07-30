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
        // Dark theme colors
        dark: {
          primary: '#000000',
          secondary: '#0a0a0a', 
          tertiary: '#1a1a1a',
          quaternary: '#2a2a2a',
          border: '#333333',
          text: {
            primary: '#ffffff',
            secondary: '#e5e5e5',
            tertiary: '#b3b3b3',
            muted: '#808080',
          }
        },
        // Accent colors that work with dark theme
        accent: {
          primary: '#8b5cf6',    // Purple
          secondary: '#06b6d4',  // Cyan  
          tertiary: '#10b981',   // Emerald
          quaternary: '#f59e0b', // Amber
          danger: '#ef4444',     // Red
          success: '#22c55e',    // Green
        },
        // Glass morphism colors
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          heavy: 'rgba(255, 255, 255, 0.2)',
        }
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #0a0a0a 100%)',
        'gradient-accent': 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
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
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-md': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 30px rgba(139, 92, 246, 0.5)',
        'dark-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'dark-xl': '0 20px 40px -4px rgba(0, 0, 0, 0.6), 0 8px 16px -4px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}