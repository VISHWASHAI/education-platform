/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2FA', 100: '#D7E1F2', 200: '#AFC3E5', 300: '#87A5D8',
          400: '#5F87CB', 500: '#3D68B3', 600: '#2C4F8C', 700: '#1F3A69',
          800: '#152A4D', 900: '#0D1B33', 950: '#081222',
        },
        blue: {
          50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
          400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
          800: '#1E40AF', 900: '#1E3A8A',
        },
        primary: '#1D4ED8',
        'primary-hover': '#2563EB',
        'primary-light': '#3B82F6',
        success: '#16A34A',
        warning: '#B45309',
        danger: '#DC2626',
        info: '#2563EB',
      },
      backdropBlur: {
        glass: '10px',
      },
      boxShadow: {
        glass: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)',
        'glass-hover': '0 4px 12px rgba(15, 23, 42, 0.10)',
      },
      borderRadius: {
        xl: '14px',
      },
      transitionDuration: {
        DEFAULT: '300ms',
      },
    },
  },
  plugins: [],
};
