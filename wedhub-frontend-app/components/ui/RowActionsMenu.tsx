"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 170;
const GAP = 4;

/**
 * A table row's "Actions ▾" dropdown, portaled to document.body and
 * positioned via the trigger button's real screen coordinates. Needed
 * because every admin table wraps its <table> in an `overflow-x-auto`
 * div for horizontal scroll on narrow viewports — an absolutely-positioned
 * dropdown nested inside that div gets clipped to its bounds by the
 * browser (overflow containment applies regardless of z-index), which is
 * most visible on the table's last row/near the bottom edge. Rendering
 * the menu into a portal at `position: fixed` escapes that ancestor
 * entirely, exactly like SharePortfolioButton.tsx's share panel.
 *
 * Opens upward for a trigger near the bottom of the viewport (e.g. the
 * table's last row) instead of always downward, which would otherwise run
 * the menu off-screen. The menu's real height varies by how many action
 * items a given row has, so position is computed in a layout effect after
 * an initial invisible render to measure it, rather than guessed.
 */
export function RowActionsMenu({
  open,
  onClose,
  triggerElement,
  children,
  align = "end",
}: {
  open: boolean;
  onClose: () => void;
  triggerElement: HTMLElement | null;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      setMeasured(false);
      return;
    }
    if (!triggerElement) return;

    function updatePosition() {
      const rect = triggerElement!.getBoundingClientRect();
      const left = align === "end" ? rect.right - MENU_WIDTH : rect.left;

      const menuHeight = menuRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUpward = measured && menuHeight > 0 && spaceBelow < menuHeight + GAP;

      const top = opensUpward ? rect.top - menuHeight - GAP : rect.bottom + GAP;
      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align, triggerElement, measured]);

  // First paint renders off-screen (below the trigger, at 0 opacity) so
  // the effect above can read the menu's real rendered height, then
  // re-positions and reveals it — otherwise there's no way to know
  // whether it needs to flip upward before it's actually in the DOM.
  useLayoutEffect(() => {
    if (open && position && !measured) {
      setMeasured(true);
    }
  }, [open, position, measured]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerElement?.contains(target)) return;
      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose, triggerElement]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        // Invisible on the first, pre-measurement paint (see the
        // useLayoutEffect above) — otherwise a downward-opening menu that's
        // about to flip upward would flash at the wrong position for a
        // frame before the flip is applied.
        visibility: measured ? "visible" : "hidden",
      }}
      className="z-50 min-w-[170px] overflow-hidden rounded-md border border-border bg-white shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}
