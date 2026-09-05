/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: "#0b0f19",
          panel: "#131826",
          border: "#232b3d",
          high: "#ef4444",
          significant: "#f59e0b",
          watching: "#eab308",
          normal: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
