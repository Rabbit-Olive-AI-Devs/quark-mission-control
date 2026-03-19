"use client";

import { useState, useRef, type ReactNode } from "react";

interface HoverCardProps {
  children: ReactNode;
  content: ReactNode;
}

export function HoverCard({ children, content }: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };
  const hide = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {open && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-[#12121A] p-3 text-xs text-[#94A3B8] shadow-xl"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {content}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#12121A]" />
        </div>
      )}
    </div>
  );
}
