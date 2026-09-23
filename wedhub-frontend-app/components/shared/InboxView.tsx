"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listConversationMessagesClient, markConversationRead, sendMessage } from "@/lib/api/messaging-client";
import type { ConversationListItem, Message } from "@/lib/api/messaging.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";

/**
 * Shared inbox UI, parameterized by role — mirrors NotificationsList.tsx's
 * couple/vendor-agnostic pattern. A Conversation always has exactly one
 * couple side and one vendor side; `viewerRole` only decides which side's
 * name/label is shown as "the other party" (a couple sees the vendor's
 * business name, a vendor sees the couple's display name), never which data
 * is fetched — the backend already scopes GET /messaging/conversations to
 * the caller's own side.
 */

function displayCoupleName(coupleUser: ConversationListItem["coupleUser"]): string {
  const name = [coupleUser.profile?.firstName, coupleUser.profile?.lastName].filter(Boolean).join(" ");
  return name || coupleUser.email;
}

function otherPartyName(conversation: ConversationListItem, viewerRole: "END_USER" | "VENDOR"): string {
  return viewerRole === "VENDOR" ? displayCoupleName(conversation.coupleUser) : conversation.vendor.businessName;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface InboxViewProps {
  viewerRole: "END_USER" | "VENDOR";
  viewerUserId: string;
  initialConversations: ConversationListItem[];
  // Selecting a conversation updates the URL's ?conversation= param (via
  // router.replace) rather than local-only state, so the thread survives a
  // refresh and is linkable — e.g. from a lead detail view's "View
  // conversation" link, or the matched-prospect message this same inbox will
  // receive once Phase 6 is built.
  initialConversationId?: string;
  // Item 6 — vendor-only: the vendor's own current rule book Media id, if
  // one is set. Passed down from the server (Settings page's GET
  // /vendors/me/rule-book) rather than fetched here, since it rarely
  // changes and every conversation shares the same one. Undefined/omitted
  // for the couple side, where the "Send rule book" action never appears.
  ruleBookMediaId?: string | null;
}

export function InboxView({
  viewerRole,
  viewerUserId,
  initialConversations,
  initialConversationId,
  ruleBookMediaId,
}: InboxViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId ?? initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function load() {
      setLoadingMessages(true);
      setError(null);
      const result = await listConversationMessagesClient(selectedId!, 1, 50);
      if (cancelled) return;
      setLoadingMessages(false);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }
      // Backend returns newest-first (see messaging.repository.ts's
      // listMessages orderBy: createdAt desc, matching every other paginated
      // list in this codebase) — reverse for a natural top-to-bottom thread.
      setMessages([...result.data].reverse());
      void markConversationRead(selectedId!);
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function selectConversation(id: string) {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("conversation", id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    const body = draft.trim();
    const result = await sendMessage(selectedId, body);
    setSending(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setMessages((prev) => [...prev, result.data]);
    setDraft("");
    setConversations((prev) =>
      prev
        .map((c) => (c.id === selectedId ? { ...c, lastMessage: { body, senderUserId: viewerUserId, createdAt: result.data.createdAt }, lastMessageAt: result.data.createdAt } : c))
        .sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()),
    );
  }

  async function handleSendRuleBook() {
    if (!selectedId || !ruleBookMediaId) return;
    setSending(true);
    setError(null);
    const body = "📄 Rule book";
    const result = await sendMessage(selectedId, body, ruleBookMediaId);
    setSending(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setMessages((prev) => [...prev, result.data]);
    setConversations((prev) =>
      prev
        .map((c) => (c.id === selectedId ? { ...c, lastMessage: { body, senderUserId: viewerUserId, createdAt: result.data.createdAt }, lastMessageAt: result.data.createdAt } : c))
        .sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()),
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
        <h3 className="mb-1.5 text-[15px] font-bold">No conversations yet</h3>
        <p className="text-[13px] text-text-grey">
          {viewerRole === "VENDOR"
            ? "Messages from couples will show up here."
            : "Message a vendor from their profile to start a conversation."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] overflow-hidden rounded-xl border border-border bg-white">
      {/* Conversation list */}
      <div className={`w-full flex-shrink-0 border-r border-border sm:w-[280px] ${selected ? "hidden sm:block" : "block"}`}>
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => selectConversation(conversation.id)}
            className={`flex w-full flex-col gap-0.5 border-b border-neutral-grey-20 px-4 py-3.5 text-left last:border-b-0 ${
              selectedId === conversation.id ? "bg-brand-primary-soft" : conversation.unreadCount > 0 ? "bg-[#fff9fa]" : "bg-transparent hover:bg-surface-input"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-bold">{otherPartyName(conversation, viewerRole)}</span>
              {conversation.unreadCount > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
            <p className="truncate text-[12px] text-text-grey">{conversation.lastMessage?.body ?? "No messages yet"}</p>
            {conversation.lastMessageAt && (
              <p className="text-[11px] text-paynes-grey-30">{formatRelativeTime(conversation.lastMessageAt)}</p>
            )}
          </button>
        ))}
      </div>

      {/* Thread */}
      <div className={`flex min-w-0 flex-1 flex-col ${selected ? "flex" : "hidden sm:flex"}`}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-text-grey">
            Select a conversation to view messages
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-text-grey hover:text-text-dark sm:hidden"
                aria-label="Back to conversation list"
              >
                ←
              </button>
              <span className="text-[14px] font-bold">{otherPartyName(selected, viewerRole)}</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loadingMessages ? (
                <p className="text-center text-[13px] text-text-grey">Loading…</p>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderUserId === viewerUserId;
                  return (
                    <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-[13px] leading-snug break-words [overflow-wrap:anywhere] ${
                          isOwn ? "bg-brand-primary text-white" : "bg-surface-input text-text-dark"
                        }`}
                      >
                        {message.body}
                        {message.media && (
                          <a
                            href={getPublicMediaUrl(message.media.originalObjectKey)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold ${
                              isOwn ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : "border-border bg-white text-text-dark hover:bg-surface-page"
                            }`}
                          >
                            📄 Download document
                          </a>
                        )}
                        <div className={`mt-1 text-[10px] ${isOwn ? "text-white/70" : "text-text-grey"}`}>
                          {formatRelativeTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {error && <p className="px-4 pb-1 text-[12px] text-red-70">{error}</p>}

            {viewerRole === "VENDOR" && ruleBookMediaId && (
              <div className="border-t border-border px-4 py-2">
                <button
                  type="button"
                  onClick={handleSendRuleBook}
                  disabled={sending}
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
                >
                  📄 Send rule book
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                maxLength={4000}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
