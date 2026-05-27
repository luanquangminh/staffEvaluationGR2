import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  variant?: "default" | "light";
  withWordmark?: boolean;
  wordmark?: string;
  tagline?: string;
  className?: string;
}

export function Logo({
  size = 40,
  variant = "default",
  withWordmark = false,
  wordmark = "Đánh Giá Chéo Nhân Sự",
  tagline = "Staff Peer Review",
  className,
}: LogoProps) {
  const isLight = variant === "light";
  const gradId = `logo-grad-${variant}-${size}`;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Đánh Giá Chéo Nhân Sự logo"
        role="img"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4F6FE5" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>

        <rect
          width="40"
          height="40"
          rx="11"
          fill={isLight ? "rgba(255,255,255,0.14)" : `url(#${gradId})`}
          stroke={isLight ? "rgba(255,255,255,0.28)" : "none"}
          strokeWidth={isLight ? 1 : 0}
        />

        <path
          d="M20 11.5 L11.5 27 L28.5 27 Z"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.1"
          fill="none"
          strokeLinejoin="round"
        />

        <circle cx="20" cy="11.5" r="2.9" fill="#fff" />
        <circle cx="11.5" cy="27" r="2.9" fill="#fff" />
        <circle cx="28.5" cy="27" r="2.9" fill="#fff" />

        <circle cx="20" cy="21.8" r="1.8" fill="#fff" fillOpacity="0.75" />
      </svg>

      {withWordmark && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "text-sm font-semibold tracking-tight",
              isLight ? "text-white" : "text-slate-900"
            )}
          >
            {wordmark}
          </span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.15em]",
              isLight ? "text-white/70" : "text-slate-500"
            )}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;
