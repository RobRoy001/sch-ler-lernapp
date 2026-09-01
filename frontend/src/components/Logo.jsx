import React from 'react';

/**
 * Kapiert? brand mark — a question mark in a warm blue-to-orange gradient
 * badge, per the "Glühbirne im Fragezeichen" logo concept in the design
 * system (claude/LernApp-Design-System.md).
 */
export default function Logo({ size = 40, rounded = true, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx={rounded ? 10 : 0} fill="url(#kapiert-logo-gradient)" />
      <path
        d="M14 15.6C14 12.1 16.6 9.5 20.1 9.5C23.6 9.5 26.1 12 26.1 15.1C26.1 17.9 24.1 19.2 22.4 20.3C21 21.2 20.5 21.9 20.5 23.2"
        stroke="white"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20.4" cy="28.4" r="1.9" fill="white" />
      <defs>
        <linearGradient id="kapiert-logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoWithText({ size = 36, textClassName = '', className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className={`font-display font-extrabold text-gray-900 ${textClassName}`}>
        Kapiert<span className="text-primary">?</span>
      </span>
    </div>
  );
}
