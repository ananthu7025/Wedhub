"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared "leave this wizard?" guard for the couple profile-setup wizard and
 * the vendor onboarding wizard (item 4, 2026-09-16 request) — a confirm
 * prompt (Save / Discard / Cancel) whenever the user tries to leave a
 * partially-filled wizard, whether via the browser's tab-close/refresh, the
 * back button, or clicking an in-app link out of the wizard.
 *
 * There is no official Next.js App Router API for blocking navigation (no
 * useBlocker-equivalent, unlike React Router) — this covers the three real
 * exit paths a couple/vendor can actually take:
 *  1. Tab close / refresh / typing a new URL -> `beforeunload` (browser's
 *     own native confirm dialog; we cannot show custom UI or copy here,
 *     that's a browser security restriction, not a gap in this component).
 *  2. Back/forward button -> a synthetic history entry + `popstate`
 *     listener that re-pushes the current entry and shows our own dialog
 *     instead of actually navigating away.
 *  3. Clicking a same-app <Link> anywhere on the page (the persistent
 *     header logo/nav are usually siblings of the wizard, not descendants
 *     of it — a page's <Link>-heavy chrome lives outside whatever wraps
 *     the wizard's own content) -> a capture-phase click listener on
 *     `document` intercepts the click, shows our dialog, and only calls
 *     router.push(href) if the user confirms leaving (Discard) or the save
 *     succeeds (Save & leave).
 */

interface WizardGuardProps {
  children: React.ReactNode;
  /** True while there is unsaved wizard progress worth prompting about. */
  hasUnsavedChanges: boolean;
  /** Persists the current in-progress state (e.g. to localStorage). Awaited before navigating away on "Save". */
  onSaveDraft: () => void | Promise<void>;
}

export function WizardGuard({ children, hasUnsavedChanges, onSaveDraft }: WizardGuardProps) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingBack, setPendingBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasUnsavedRef = useRef(hasUnsavedChanges);
  hasUnsavedRef.current = hasUnsavedChanges;

  // 1. Tab close / refresh / address-bar navigation.
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedRef.current) return;
      event.preventDefault();
      // Chrome ignores any custom string here and shows its own generic
      // message — required for the browser to show a prompt at all.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // 2. Back/forward button — push a marker entry so the first "back" is
  // interceptable; if the user confirms leaving, we go back twice (past
  // our own marker) to actually land where they intended.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    window.history.pushState({ wizardGuard: true }, "");

    function handlePopState() {
      if (!hasUnsavedRef.current) return;
      // Re-assert the marker so rapid repeated back-presses don't slip
      // through before the dialog is dismissed.
      window.history.pushState({ wizardGuard: true }, "");
      setPendingBack(true);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges]);

  // 3. In-app <Link> clicks anywhere on the page — attached to `document`,
  // not a container ref scoped to this component's own children, since the
  // page's persistent header/nav/footer (where a "way out" link like the
  // brand logo actually lives) is typically a SIBLING of wherever
  // <WizardGuard> is mounted, not a descendant of it.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!hasUnsavedRef.current) return;
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Only intercept same-app relative links — never external/mailto/
      // hash-only links, which aren't "leaving the wizard" in the sense
      // this guard cares about.
      if (!href || !href.startsWith("/")) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  const handleDiscard = useCallback(() => {
    if (pendingBack) {
      setPendingBack(false);
      // Go back past our own marker entry to actually leave.
      window.history.go(-2);
      return;
    }
    if (pendingHref) {
      const href = pendingHref;
      setPendingHref(null);
      router.push(href);
    }
  }, [pendingBack, pendingHref, router]);

  const handleSaveAndLeave = useCallback(async () => {
    setSaving(true);
    await onSaveDraft();
    setSaving(false);
    handleDiscard();
  }, [onSaveDraft, handleDiscard]);

  const handleCancel = useCallback(() => {
    setPendingHref(null);
    setPendingBack(false);
  }, []);

  const dialogOpen = pendingHref !== null || pendingBack;

  return (
    <>
      {children}

      {dialogOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold">Save your progress?</h3>
            <p className="mb-5 text-[13px] text-text-grey">
              You have unsaved changes. Save a draft so you can pick up where you left off, or continue without
              saving.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveAndLeave}
                disabled={saving}
                className="rounded-md bg-brand-primary py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save draft and leave"}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="rounded-md border border-border bg-white py-2.5 text-[13px] font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
              >
                Continue without saving
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="py-1.5 text-[13px] font-semibold text-text-grey hover:text-text-dark disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
