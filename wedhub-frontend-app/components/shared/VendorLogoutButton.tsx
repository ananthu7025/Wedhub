"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth-client";

export function VendorLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-text-grey hover:bg-surface-input hover:text-text-dark"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      Logout
    </button>
  );
}
