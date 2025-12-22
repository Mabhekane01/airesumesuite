const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
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
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif', ...defaultTheme.fontFamily.sans],
        display: ['Cal Sans', 'Inter', 'SF Pro Display', 'sans-serif'],
      },
      colors: {
        // Explicitly include all default colors to ensure they are available
        ...colors,
        
        // Custom Theme Colors (Resume.io Inspired - Light Mode Default)
        background: '#f8fafc', // Slate 50
        surface: {
          50: '#ffffff', // White
          100: '#f1f5f9', // Slate 100
          200: '#e2e8f0', // Slate 200
          300: '#cbd5e1', // Slate 300
          400: '#94a3b8', // Slate 400
          500: '#64748b', // Slate 500
        },
        brand: {
          blue: '#2563eb',    // Standard Blue
          violet: '#7c3aed',  // Vivid Violet
          cyan: '#06b6d4',    // Bright Cyan
          indigo: '#4f46e5',  // Deep Indigo
          fuchsia: '#d946ef', // Electric Pink/Purple
          dark: '#0f172a',    // Deep Slate (Brand Dark)
        },
        text: {
          primary: '#0f172a', // Slate 900
          secondary: '#475569', // Slate 600
          tertiary: '#94a3b8', // Slate 400
          muted: '#cbd5e1', // Slate 300
        },
        // Functional Colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        
        // Extended Accent Palette for Dark Mode
        accent: {
          primary: '#2563eb', // brand.blue
          secondary: '#7c3aed', // brand.violet
          tertiary: '#06b6d4', // brand.cyan
          quaternary: '#d946ef', // brand.fuchsia
          danger: '#ef4444', // error
        },
        
        // Glass Effects Colors
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.05)',
          dark: 'rgba(0, 0, 0, 0.3)',
        },

        // Compatibility Mappings (merging into existing palettes)
        gray: {
          ...colors.gray, // Keep all default grays
          900: '#0f172a', // Override 900 to map to brand.dark
          800: '#0B0F17', // Override 800 to map to surface.50
          500: '#64748b', // Override 500 to map to text.tertiary
          400: '#94a3b8', // Override 400 to map to text.secondary
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'liquid-mesh': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
        'grid-pattern': 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'32\' height=\'32\' fill=\'none\' stroke=\'rgb(255 255 255 / 0.04)\'%3e%3cpath d=\'M0 .5H31.5V32\'/%3e%3c/svg%3e")',
        'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3e")',
      },
      backdropBlur: {
        xs: '2px',
        md: '12px',
        lg: '24px',
        xl: '40px',
        '2xl': '64px',
      },
      animation: {
        'blob': 'blob 10s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'spotlight': 'spotlight 2s ease .75s 1 forwards',
        'meteor': 'meteor 5s linear infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        spotlight: {
          '0%': { opacity: 0, transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: 1, transform: 'translate(-50%,-40%) scale(1)' },
        },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: 1 },
          '70%': { opacity: 1 },
          '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: 0 },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 40px -10px rgba(37, 99, 235, 0.5)',
        'glow-violet': '0 0 40px -10px rgba(124, 58, 237, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glass-inset': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'neon': '0 0 5px theme("colors.brand.blue"), 0 0 20px theme("colors.brand.violet")',
        'resume': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'resume-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        
        // Extended Shadows for Dark Theme
        'glow-sm': '0 0 10px -2px rgba(37, 99, 235, 0.3)',
        'glow-md': '0 0 20px -5px rgba(37, 99, 235, 0.4)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
        'dark-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      },
      backgroundSize: {
        '200%': '200% auto',
      },
    },
  },
  plugins: [],
}