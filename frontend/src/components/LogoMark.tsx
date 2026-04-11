import React from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * DDoc logo mark — a bold D letterform whose counter contains
 * three horizontal lines suggesting a document.
 * The SVG includes its own rounded-square background.
 */
const LogoMark: React.FC<LogoMarkProps> = ({ size = 32, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="DDoc logo"
  >
    {/* Blue rounded-square background */}
    <rect width="32" height="32" rx="6" fill="#1e3a8a" />

    {/* Outer D shape — white fill forms the letter strokes */}
    <path
      d="M6 5 H15 C24 5 27 10.5 27 16 C27 21.5 24 27 15 27 H6 Z"
      fill="white"
    />

    {/* Inner cutout — turns solid D into hollow letterform */}
    <path
      d="M10 9 H15 C21 9 23 12 23 16 C23 20 21 23 15 23 H10 Z"
      fill="#1e3a8a"
    />

    {/* Document lines inside the D counter */}
    <rect x="11.5" y="11.5" width="6"   height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
    <rect x="11.5" y="15"   width="9"   height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
    <rect x="11.5" y="18.5" width="6"   height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
  </svg>
);

export default LogoMark;
