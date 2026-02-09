"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface HelpTooltipProps {
  children: ReactNode;
}

export default function HelpTooltip({ children }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-all"
        aria-label="Help"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 p-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl"
        >
          <div className="text-sm">{children}</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1">
            <div className="border-8 border-transparent border-t-slate-700" />
          </div>
        </div>
      )}
    </div>
  );
}
