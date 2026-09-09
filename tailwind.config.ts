import type { Config } from "tailwindcss";

/**
 * Every colour is a token, never a literal. There is one mode — paper — so no
 * component branches on theme; it just uses the name.
 */
export default {
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
        "2xl": "calc(var(--r-xl) + 8px)",
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
        /* Three voices, the same three the landing has. "sans" and "display"
           are both Inter Tight on purpose: the product sets it at 400 for prose
           and 680 for headings, which is the landing's own split. */
        sans: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        /* Label tracking is a brand constant, not a per-component choice. It
           used to be 0.12em, which only reads under an uppercase mono label;
           at sentence case that much air pulls the word apart. */
        mono: "0.02em",
        display: "-0.02em",
      },
      fontWeight: {
        /* 600, not 680: the heavier cut is what gave headings their slab. */
        display: "600",
      },
      fontSize: {
        /* quiet metadata → confident balances → the landing's editorial sizes */
        micro: ["0.6875rem", { lineHeight: "1.05rem", letterSpacing: "0.01em" }],
        label: ["0.8125rem", { lineHeight: "1.15rem", letterSpacing: "0.01em" }],
        hero: ["2.5rem", { lineHeight: "1.06", letterSpacing: "-0.02em" }],
        display: ["3.25rem", { lineHeight: "1.04", letterSpacing: "-0.022em" }],
        "display-lg": ["4.25rem", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        "display-xl": ["6.5rem", { lineHeight: "1", letterSpacing: "-0.03em" }],
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
