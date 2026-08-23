"use client";

import { useEffect } from "react";

export default function ClientBody({ children }: { children: React.ReactNode }) {
  // Browser extensions inject classes onto <body> before hydration; resetting
  // after mount keeps React from warning about the mismatch.
  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  return <div className="antialiased">{children}</div>;
}
