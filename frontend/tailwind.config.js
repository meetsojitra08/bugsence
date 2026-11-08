/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--primary))",
        text: {
          DEFAULT: "hsl(var(--text))",
          muted: "hsl(var(--text-muted))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "#ffffff",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "#ffffff",
        },
        // Status Colors from ui-context.md
        status: {
          backlog: "hsl(var(--status-backlog))",
          todo: "hsl(var(--status-todo))",
          in_progress: "hsl(var(--status-in-progress))",
          in_review: "hsl(var(--status-in-review))",
          done: "hsl(var(--status-done))",
          closed: "hsl(var(--status-closed))",
        },
        // Priority Colors from ui-context.md
        priority: {
          urgent: "hsl(var(--priority-urgent))",
          high: "hsl(var(--priority-high))",
          medium: "hsl(var(--priority-medium))",
          low: "hsl(var(--priority-low))",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "6px",
        lg: "10px",
        xl: "14px",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
      },
      transitionTimingFunction: {
        subtle: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
