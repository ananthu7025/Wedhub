/**
 * Small inline SVG icon set for the community feature — replaces the
 * emoji glyphs (💍 🖼️ 📊 ❓ 💬 ▲ ❤️ 🤍) that don't render consistently
 * across platforms/fonts. Same stroke-icon convention already used
 * throughout this codebase (see PublicTopbar.tsx's inline <svg
 * viewBox="0 0 24 24" fill="none" stroke="currentColor">), not a new
 * icon library dependency.
 */
type IconProps = { className?: string };

export function RingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <circle cx="9" cy="15" r="5" />
      <circle cx="9" cy="15" r="1.6" fill="currentColor" stroke="none" />
      <path d="M9 10 L13 4 L18 9 L14 12.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 4 L15 6.5" strokeLinecap="round" />
    </svg>
  );
}

export function PhotoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.75" />
      <path d="M21 16l-5.5-5.5a2 2 0 00-2.8 0L4 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PollIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M4 20V10" strokeLinecap="round" />
      <path d="M12 20V4" strokeLinecap="round" />
      <path d="M20 20v-6" strokeLinecap="round" />
    </svg>
  );
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.5a2.8 2.8 0 0 1 5.4.9c0 1.9-2.4 2-2.6 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CommentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path
        d="M20.8 8.6c0 4.5-8.8 10.1-8.8 10.1S3.2 13.1 3.2 8.6a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UpvoteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 4l8 9h-5v7H9v-7H4z" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
