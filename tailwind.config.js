/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C5CFC',
          hover: '#6845e6',
          light: '#A78BFA',
          lighter: '#C4B5FD',
          soft: 'rgba(124, 92, 252, 0.1)',
        },
        secondary: {
          DEFAULT: '#A78BFA',
          light: '#C4B5FD',
        },
        success: {
          DEFAULT: '#22C55E',
          soft: 'rgba(34, 197, 94, 0.1)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          soft: 'rgba(245, 158, 11, 0.1)',
        },
        danger: {
          DEFAULT: '#EF4444',
          soft: 'rgba(239, 68, 68, 0.1)',
        },
        // Custom background & text colors
        brandBg: {
          light: '#F8F9FD',
          dark: '#0B0F19',
        },
        brandCard: {
          light: '#FFFFFF',
          dark: '#151B2C',
        },
        brandText: {
          primaryLight: '#111827',
          secondaryLight: '#6B7280',
          primaryDark: '#F3F4F6',
          secondaryDark: '#9CA3AF',
        }
      },
      borderRadius: {
        '3xl': '24px',
        '2xl': '20px',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 30px rgb(0 0 0 / 0.04)',
        'premium': '0 12px 40px -4px rgba(124, 92, 252, 0.12)',
        'glow': '0 0 20px rgba(124, 92, 252, 0.35)',
      }
    },
  },
  plugins: [],
}
