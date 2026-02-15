"use client";

interface ETFBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  xs: {
    badge: "h-4 px-1.5 text-[10px]",
    icon: "w-2.5 h-2.5",
  },
  sm: {
    badge: "h-5 px-2 text-xs",
    icon: "w-3 h-3",
  },
  md: {
    badge: "h-6 px-2.5 text-xs",
    icon: "w-3.5 h-3.5",
  },
  lg: {
    badge: "h-7 px-3 text-sm",
    icon: "w-4 h-4",
  },
};

export default function ETFBadge({
  size = "sm",
  showLabel = true,
  className = ""
}: ETFBadgeProps) {
  const config = sizeConfig[size];

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-semibold
        bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-indigo-500/20
        text-sky-300 border border-sky-500/30
        backdrop-blur-sm
        ${config.badge}
        ${className}
      `}
      title="Exchange-Traded Fund"
    >
      {/* ETF Icon - stacked bars representing fund composition */}
      <svg
        className={config.icon}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="9" width="3" height="5" rx="0.5" fill="currentColor" opacity="0.6" />
        <rect x="6.5" y="5" width="3" height="9" rx="0.5" fill="currentColor" opacity="0.8" />
        <rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor" />
      </svg>
      {showLabel && <span>ETF</span>}
    </span>
  );
}
