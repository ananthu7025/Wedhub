"use client";

import { useState } from "react";

/** Pure client-side days-remaining calculation off a real ISO date — computed once at mount (lazy useState initializer), not on every render, so it stays a pure render per React's rules-of-hooks. */
export function ChallengeCountdown({ targetDate, label }: { targetDate: string; label: string }) {
  const [daysRemaining] = useState(() => Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86_400_000)));

  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-text-dark">{daysRemaining}</p>
      <p className="text-xs text-text-grey">{label}</p>
    </div>
  );
}
