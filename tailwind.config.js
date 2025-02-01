/** @type {import('tailwindcss').Config} */
module.exports = {
    // Enable dark mode using the "class" strategy
    darkMode: 'class',
  
    // Specify where Tailwind should look for class names
    content: [
      './pages/**/*.{ts,tsx}',
      './components/**/*.{ts,tsx}',
      './app/**/*.{ts,tsx}',
      './src/**/*.{ts,tsx}',
      './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
    ],
  
    theme: {
      // Default values for transparent and current
      transparent: 'transparent',
      current: 'currentColor',
  
      extend: {
        // Extend the font families
        fontFamily: {
          sans: ['var(--font-inter)'],
          montserrat: ['Montserrat', 'sans-serif'],
        },
  
        // Custom keyframes and animations
        keyframes: {
          'caret-blink': {
            '0%, 70%, 100%': { opacity: '1' },
            '20%, 50%': { opacity: '0' },
          },
        },
        animation: {
          'caret-blink': 'caret-blink 1.25s ease-out infinite',
        },
  
        // Extended colors for light and dark modes along with additional custom colors
        colors: {
          // Light mode colors
          tremor: {
            brand: {
              faint: '#eff6ff', // blue-50
              muted: '#bfdbfe', // blue-200
              subtle: '#60a5fa', // blue-400
              DEFAULT: '#3b82f6', // blue-500
              emphasis: '#1d4ed8', // blue-700
              inverted: '#ffffff', // white
            },
            background: {
              muted: '#f9fafb', // gray-50
              subtle: '#f3f4f6', // gray-100
              DEFAULT: '#ffffff', // white
              emphasis: '#374151', // gray-700
            },
            border: {
              DEFAULT: '#e5e7eb', // gray-200
            },
            ring: {
              DEFAULT: '#e5e7eb', // gray-200
            },
            content: {
              subtle: '#9ca3af', // gray-400
              DEFAULT: '#6b7280', // gray-500
              emphasis: '#374151', // gray-700
              strong: '#111827', // gray-900
              inverted: '#ffffff', // white
            },
          },
  
          // Dark mode colors (access via the "dark-tremor" key)
          'dark-tremor': {
            brand: {
              faint: '#0B1229', // custom
              muted: '#172554', // blue-950
              subtle: '#1e40af', // blue-800
              DEFAULT: '#3b82f6', // blue-500
              emphasis: '#60a5fa', // blue-400
              inverted: '#030712', // gray-950
            },
            background: {
              muted: '#131A2B', // custom
              subtle: '#1f2937', // gray-800
              DEFAULT: '#111827', // gray-900
              emphasis: '#d1d5db', // gray-300
            },
            border: {
              DEFAULT: '#1f2937', // gray-800
            },
            ring: {
              DEFAULT: '#1f2937', // gray-800
            },
            content: {
              subtle: '#4b5563', // gray-600
              DEFAULT: '#6b7280', // gray-600
              emphasis: '#e5e7eb', // gray-200
              strong: '#f9fafb', // gray-50
              inverted: '#000000', // black
            },
          },
  
          // Additional custom colors
          'upside-white': '#f9fafb',
          'upside-black': '#111827',
          'xmap-gray': '#000000',
        },
  
        // Custom box shadows for light and dark modes
        boxShadow: {
          // Light mode shadows
          'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          'tremor-card':
            '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          'tremor-dropdown':
            '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  
          // Dark mode shadows
          'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          'dark-tremor-card':
            '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          'dark-tremor-dropdown':
            '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
  
        // Custom border radii
        borderRadius: {
          'tremor-small': '0.375rem',
          'tremor-default': '0.5rem',
          'tremor-full': '9999px',
        },
  
        // Custom font sizes
        fontSize: {
          'tremor-label': ['0.75rem'],
          'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
          'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
          'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
        },
      },
    },
  
    // Safelist patterns for dynamic class names
    safelist: [
      {
        pattern:
          /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        variants: ['hover', 'ui-selected'],
      },
      {
        pattern:
          /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        variants: ['hover', 'ui-selected'],
      },
      {
        pattern:
          /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        variants: ['hover', 'ui-selected'],
      },
      {
        pattern:
          /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      },
      {
        pattern:
          /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      },
      {
        pattern:
          /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      },
    ],
  
    // Plugins to extend Tailwind's functionality
    plugins: [require('tailwindcss-animate')],
  };
  