"use client";

import { rememberAgentRef } from "@/lib/agent-code";
import { useEffect } from "react";

export default function ClientBody({ children }: { children: React.ReactNode }) {
  // Browser extensions inject classes onto <body> before hydration; resetting
  // after mount keeps React from warning about the mismatch.
  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  // An agent's link (?ref=LQ-TOLU) can land on any page; keep the code for
  // the signup form, which comes after email verification.
  useEffect(() => {
    rememberAgentRef();
  }, []);

  return <div className="antialiased">{children}</div>;
}
