import type { Config } from "tailwindcss";

/**
 * Every colour is a token, never a literal. Light and dark differ only in the
 * values behind these names — no component should branch on theme.
 */
export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          2: "hsl(var(--surface-2) / <alpha-value>)",
          3: "hsl(var(--surface-3) / <alpha-value>)",
        },
        text: {
          DEFAULT: "hsl(var(--text) / <alpha-value>)",
          muted: "hsl(var(--text-muted) / <alpha-value>)",
          subtle: "hsl(var(--text-subtle) / <alpha-value>)",
        },
        line: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          strong: "hsl(var(--border-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
          text: "hsl(var(--accent-text) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
          contrast: "hsl(var(--accent-contrast) / <alpha-value>)",
          foreground: "hsl(var(--accent-contrast) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          soft: "hsl(var(--danger-soft) / <alpha-value>)",
        },
        ticket: {
          DEFAULT: "hsl(var(--ticket) / <alpha-value>)",
          edge: "hsl(var(--ticket-edge) / <alpha-value>)",
        },
        printer: "hsl(var(--printer) / <alpha-value>)",

        /* shadcn compatibility */
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        card: "var(--r-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionTimingFunction: {
        linq: "var(--ease)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        DEFAULT: "var(--dur)",
        slow: "var(--dur-slow)",
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "18": "4.5rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        /* quiet metadata → confident balances */
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        display: ["3.25rem", { lineHeight: "1.02", letterSpacing: "-0.045em" }],
        hero: ["2.5rem", { lineHeight: "1.06", letterSpacing: "-0.04em" }],
      },
      container: {
        center: true,
        padding: { DEFAULT: "1rem", sm: "2rem", lg: "4rem", xl: "5rem", "2xl": "6rem" },
        screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
