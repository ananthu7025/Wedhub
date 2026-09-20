"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicQuotation } from "@/lib/api/vendor-quotations.types";
import { publicAcceptQuotationClient, publicDeclineQuotationClient } from "@/lib/api/vendor-quotations-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";

interface PublicQuotationViewProps {
  quotation: PublicQuotation;
}

export function PublicQuotationView({ quotation: initialQuotation }: PublicQuotationViewProps) {
  const [quotation, setQuotation] = useState<PublicQuotation>(initialQuotation);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [clientNote, setClientNote] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatINR(val: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: quotation.currency || "INR",
      maximumFractionDigits: 0,
    }).format(val);
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  const logoUrl = quotation.vendorLogoKey
    ? getPublicMediaUrl(quotation.vendorLogoKey)
    : quotation.vendor.profile?.logoMedia?.thumbnailObjectKey
      ? getPublicMediaUrl(quotation.vendor.profile.logoMedia.thumbnailObjectKey)
      : null;

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    const res = await publicAcceptQuotationClient(quotation.viewToken, clientNote.trim() || undefined);
    setAccepting(false);
    if (res.success) {
      setQuotation(res.data.quotation);
      setIsAcceptModalOpen(false);
    } else {
      setError(formatApiError(res.error));
    }
  }

  async function handleDecline() {
    setDeclining(true);
    setError(null);
    const res = await publicDeclineQuotationClient(quotation.viewToken, declineReason.trim() || undefined);
    setDeclining(false);
    if (res.success) {
      setQuotation(res.data.quotation);
      setIsDeclineModalOpen(false);
    } else {
      setError(formatApiError(res.error));
    }
  }

  // Format WhatsApp message to vendor
  const vendorPhoneDigits = quotation.vendorPhone ? quotation.vendorPhone.replace(/\D/g, "") : "";
  let cleanVendorPhone = vendorPhoneDigits;
  if (cleanVendorPhone.length === 10) cleanVendorPhone = `91${cleanVendorPhone}`;
  else if (cleanVendorPhone.length === 11 && cleanVendorPhone.startsWith("0")) cleanVendorPhone = `91${cleanVendorPhone.slice(1)}`;

  const waVendorText = encodeURIComponent(
    `Hi ${quotation.vendorBusinessName}, I received and reviewed proposal #${quotation.quotationNumber} for ${quotation.clientName}. I would like to discuss a few details!`,
  );
  const vendorWhatsAppUrl = cleanVendorPhone ? `https://wa.me/${cleanVendorPhone}?text=${waVendorText}` : null;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-20 font-sans text-neutral-900">
      {/* Top Banner */}
      <div className="border-b border-neutral-200/80 bg-white shadow-2xs">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-12 w-12 rounded-xl object-cover border border-neutral-200"
              />
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                {quotation.vendorCategory || "Wedding Vendor"}
              </span>
              <h1 className="text-lg font-black text-neutral-900 leading-tight">
                {quotation.vendorBusinessName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/vendors/${quotation.vendor.slug}`}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
            >
              View Portfolio
            </Link>

            <Link
              href={`/quotes/${quotation.viewToken}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Download PDF
            </Link>

            {vendorWhatsAppUrl && (
              <a
                href={vendorWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-xl bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#20ba5a] transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                </svg>
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Hero Welcome Card */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6">
        {quotation.status === "ACCEPTED" ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-lg">
                ✓
              </span>
              <div>
                <h2 className="text-base font-bold">Proposal Accepted!</h2>
                <p className="text-xs text-emerald-700">
                  You accepted this proposal on {formatDate(quotation.acceptedAt)}. The vendor has been notified and
                  will get in touch for next steps.
                </p>
              </div>
            </div>
          </div>
        ) : quotation.status === "DECLINED" ? (
          <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-100 p-5 text-neutral-700">
            <p className="text-xs">
              This proposal was marked as declined. Please contact {quotation.vendorBusinessName} if you would like
              an updated quotation.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-brand-primary/20 bg-gradient-to-r from-brand-primary/5 via-white to-brand-primary/5 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                Official Wedding Proposal
              </span>
              <h2 className="text-xl font-black text-neutral-900 mt-0.5">Prepared for {quotation.clientName}</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Ref: #{quotation.quotationNumber} · Valid until {formatDate(quotation.validUntil)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(true)}
                className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Decline
              </button>

              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(true)}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-[0.98]"
              >
                ✓ Accept Proposal
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Main Proposal Sheet */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10 shadow-sm space-y-8">
          {/* Event & Proposal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-xl bg-neutral-50 p-5 border border-neutral-100">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Event Overview</span>
              <h3 className="text-base font-bold text-neutral-900">{quotation.title}</h3>
              <p className="text-xs text-neutral-600">
                Type: <strong>{quotation.eventType}</strong>
              </p>
              {quotation.eventDate && (
                <p className="text-xs text-neutral-600">
                  Event Date: <strong>{formatDate(quotation.eventDate)}</strong>
                </p>
              )}
              {quotation.eventLocation && (
                <p className="text-xs text-neutral-600">Location: {quotation.eventLocation}</p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Vendor Partner</span>
              <h4 className="text-sm font-bold text-neutral-900">{quotation.vendorBusinessName}</h4>
              {quotation.vendorPhone && <p className="text-xs text-neutral-600">Phone: {quotation.vendorPhone}</p>}
              {quotation.vendorEmail && <p className="text-xs text-neutral-600">Email: {quotation.vendorEmail}</p>}
              {quotation.vendorAddress && <p className="text-xs text-neutral-600">{quotation.vendorAddress}</p>}
            </div>
          </div>

          {/* Introductory Message */}
          {quotation.introduction && (
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-5 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {quotation.introduction}
            </div>
          )}

          {/* Included Packages and Deliverables */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
              Deliverables &amp; Inclusions
            </h3>

            <div className="space-y-4">
              {quotation.items.map((it, idx) => (
                <div
                  key={it.id}
                  className="rounded-xl border border-neutral-200/80 p-5 space-y-3 transition hover:border-neutral-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-neutral-900">{it.name}</h4>
                      </div>
                      {it.description && <p className="text-xs text-neutral-600 pl-7">{it.description}</p>}
                    </div>

                    <div className="text-right pl-7 sm:pl-0">
                      <span className="font-extrabold text-neutral-900 text-base">{formatINR(it.total)}</span>
                      {it.quantity > 1 && (
                        <span className="block text-[11px] text-neutral-400">
                          {it.quantity} × {formatINR(it.unitPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {it.inclusions && it.inclusions.length > 0 && (
                    <div className="rounded-lg bg-neutral-50 p-3.5 border border-neutral-100 pl-4 space-y-1.5">
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Included in this package:
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-neutral-700">
                        {it.inclusions.map((inc, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-brand-primary font-bold">✓</span>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="flex flex-col sm:flex-row justify-end border-t border-neutral-200 pt-6">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Services Subtotal:</span>
                <span className="font-semibold text-neutral-900">{formatINR(quotation.subtotal)}</span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Special Discount:</span>
                  <span>-{formatINR(quotation.discount)}</span>
                </div>
              )}
              {quotation.taxRate > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>GST ({quotation.taxRate}%):</span>
                  <span>+{formatINR(quotation.taxAmount)}</span>
                </div>
              )}
              <div className="border-t-2 border-neutral-900 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="block text-sm font-bold text-neutral-900">Total Investment</span>
                  <span className="block text-[10px] text-neutral-400">Taxes &amp; deliverables included</span>
                </div>
                <span className="text-2xl font-black text-brand-primary">{formatINR(quotation.grandTotal)}</span>
              </div>
              {quotation.amountInWords && (
                <p className="text-[11px] text-neutral-400 italic text-right pt-0.5">{quotation.amountInWords}</p>
              )}
            </div>
          </div>

          {/* Payment Terms & Conditions */}
          {(quotation.paymentTerms || quotation.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
              {quotation.paymentTerms && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Payment Milestones</h4>
                  <div className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed rounded-xl bg-neutral-50 p-4 border border-neutral-100">
                    {quotation.paymentTerms}
                  </div>
                </div>
              )}

              {quotation.terms && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Terms &amp; Policy</h4>
                  <div className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed rounded-xl bg-neutral-50 p-4 border border-neutral-100">
                    {quotation.terms}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Call to Action for Couple */}
          {quotation.status !== "ACCEPTED" && quotation.status !== "DECLINED" && (
            <div className="border-t border-neutral-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50/50 p-6 rounded-2xl">
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">Ready to confirm your wedding booking?</h4>
                <p className="text-xs text-neutral-500">
                  Accept this proposal to reserve your dates with {quotation.vendorBusinessName}.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(true)}
                  className="w-full sm:w-auto rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(true)}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition active:scale-[0.98]"
                >
                  ✓ Accept Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accept Proposal Modal */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 text-base">Accept Proposal</h3>
              <button onClick={() => setIsAcceptModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              You are accepting proposal <strong>#{quotation.quotationNumber}</strong> for{" "}
              <strong>{formatINR(quotation.grandTotal)}</strong> from {quotation.vendorBusinessName}.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Add an optional message or note</label>
              <textarea
                rows={3}
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                placeholder="e.g. We love the package and look forward to working together!"
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {accepting ? "Confirming..." : "Confirm Acceptance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Proposal Modal */}
      {isDeclineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 text-base">Decline Proposal</h3>
              <button onClick={() => setIsDeclineModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Let {quotation.vendorBusinessName} know why you are declining this proposal:
            </p>

            <div>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Budget constraints, selected another vendor, or date changed..."
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(false)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={declining}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {declining ? "Declining..." : "Decline Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
