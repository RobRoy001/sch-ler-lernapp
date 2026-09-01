export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
          dark: '#1E40AF',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#047857',
        },
        accent: {
          DEFAULT: '#F97316',
          light: '#FED7AA',
          dark: '#C2410C',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#991B1B',
        },
        canvas: '#FAFAF9',
        cream: '#FFFBF0',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.04)',
        md: '0 4px 12px rgba(0, 0, 0, 0.08)',
        lg: '0 8px 16px rgba(0, 0, 0, 0.12)',
        xl: '0 12px 24px rgba(0, 0, 0, 0.16)',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        checkPulse: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        bounceIn: 'bounceIn 0.6s ease-out',
        fadeInUp: 'fadeInUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        checkPulse: 'checkPulse 0.6s ease-out',
      },
    },
  },
  plugins: [],
}
