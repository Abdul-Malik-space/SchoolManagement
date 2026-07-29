/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#0F172A",
          800: "#161F32",
          700: "#22304A"
        },
        brand: {
          50: "#EDFAF7",
          100: "#D3F2EA",
          200: "#A6E4D6",
          300: "#70CFBE",
          400: "#3FB39F",
          500: "#0F766E",
          600: "#0C625B",
          700: "#0A4F49",
          800: "#083D38",
          900: "#062B28"
        },
        amber: {
          500: "#F59E0B"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)",
        pop: "0 8px 24px rgba(15, 23, 42, 0.12)"
      },
      borderRadius: {
        xl: "0.875rem"
      }
    }
  },
  plugins: []
};
