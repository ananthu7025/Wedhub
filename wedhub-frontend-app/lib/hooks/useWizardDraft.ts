"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * localStorage-only draft persistence for a wizard (item 4, 2026-09-16
 * request — confirmed decision: localStorage only for v1, no server-side
 * draft endpoint). Shared between the couple profile-setup wizard and the
 * vendor onboarding wizard.
 *
 * Wrapped in try/catch throughout per this codebase's browser-storage
 * convention (artifact-design guidance applies generally: storage can throw
 * in a private window, with cleared/blocked site data, etc. — the wizard
 * must still work with drafts simply not persisting in that case).
 */
export function useWizardDraft<T>(storageKey: string, initialState: T) {
  // Client Components still render once on the server for the initial HTML
  // (Next.js App Router), where `window` doesn't exist — the lazy
  // useState initializer must return initialState there and only read a
  // real draft back on the client via the effect below, or hydration would
  // crash outright.
  const [state, setState] = useState<T>(initialState);
  const [draftLoaded, setDraftLoaded] = useState(false);
  // Item 6: distinct from draftLoaded, which becomes true after the
  // mount-time localStorage read regardless of whether anything was
  // actually there. This only flips true when a raw value genuinely
  // existed in storage on mount, so callers can show a one-time "draft
  // restored" toast without it firing for every fresh, empty wizard visit.
  const [draftRestored, setDraftRestored] = useState(false);

  // Tracks whether the current state differs from what was last explicitly
  // saved (draft or submitted) — this, not "is state non-default", is what
  // WizardGuard should treat as "unsaved changes" worth prompting about. A
  // freshly-loaded draft is itself "already saved" (it's resumed, not
  // edited yet), so loading one updates this baseline too, not just state.
  const lastSavedRef = useRef<string>(JSON.stringify(initialState));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const merged = { ...initialState, ...(JSON.parse(raw) as Partial<T>) };
        setState(merged);
        lastSavedRef.current = JSON.stringify(merged);
        setDraftRestored(true);
      }
    } catch {
      // See saveDraft's comment below — storage can be unavailable.
    }
    setDraftLoaded(true);
    // Only ever re-run if the caller genuinely switches keys (e.g. a
    // different wizard instance) — reading initialState/storageKey once on
    // mount is the intent, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(state) !== lastSavedRef.current);
  }, [state]);

  const saveDraft = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
      lastSavedRef.current = JSON.stringify(state);
      setHasUnsavedChanges(false);
    } catch {
      // Storage unavailable (private window, quota, blocked) — the wizard
      // still functions in-memory for this session, it just can't resume
      // across a reload. Not surfaced as an error to the user: this is a
      // convenience feature, not a required one.
    }
  }, [state, storageKey]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // See saveDraft's comment.
    }
    lastSavedRef.current = JSON.stringify(initialState);
    setHasUnsavedChanges(false);
  }, [storageKey, initialState]);

  // Called after a successful server submit — the submitted state IS now
  // the "saved" baseline, same as an explicit draft save, so this wizard
  // instance stops prompting to leave.
  const markSubmitted = useCallback(() => {
    lastSavedRef.current = JSON.stringify(state);
    setHasUnsavedChanges(false);
  }, [state]);

  return { state, setState, hasUnsavedChanges, saveDraft, clearDraft, markSubmitted, draftLoaded, draftRestored };
}
