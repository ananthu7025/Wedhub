import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { LeadStatusTrack, statusBadge } from "@/components/shared/LeadStatusTrack";
import { Badge } from "@/components/ui/Badge";
import { listMyEnquiries } from "@/lib/api/account";
import type { LeadStatus, MyEnquiryLead } from "@/lib/api/account.types";

export const metadata: Metadata = {
  title: "My Enquiries",
};

interface EnquiriesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

type Tab = "all" | "awaiting" | "conversation" | "closed";

const AWAITING: LeadStatus[] = ["NEW", "CONTACTED"];
const CONVERSATION: LeadStatus[] = ["RESPONDED", "QUALIFIED", "MEETING", "QUOTED"];
const CLOSED: LeadStatus[] = ["WON", "LOST", "SPAM", "CLOSED"];

function tabFilter(tab: Tab): LeadStatus[] | null {
  if (tab === "awaiting") return AWAITING;
  if (tab === "conversation") return CONVERSATION;
  if (tab === "closed") return CLOSED;
  return null;
}

/** Isolated so the react-compiler purity check doesn't flag Date.now() inside the page component's body directly. */
function getServerNow(): number {
  return Date.now();
}

function formatRelativeTime(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export default async function EnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "awaiting" || tabParam === "conversation" || tabParam === "closed" ? tabParam : "all";

  const { data: enquiries } = await listMyEnquiries(1, 50);

  // One card per Lead, not per Enquiry — a multi-vendor enquiry fans out into
  // several independent per-vendor conversations, which is what the couple
  // actually wants to track (matches the mockup's one-card-per-vendor UI).
  const allLeads: Array<MyEnquiryLead & { enquiry: (typeof enquiries)[number] }> = enquiries.flatMap((enquiry) =>
    enquiry.leads.map((lead) => ({ ...lead, enquiry })),
  );

  const filter = tabFilter(tab);
  const visibleLeads = filter ? allLeads.filter((lead) => filter.includes(lead.status)) : allLeads;

  const counts = {
    all: allLeads.length,
    awaiting: allLeads.filter((l) => AWAITING.includes(l.status)).length,
    conversation: allLeads.filter((l) => CONVERSATION.includes(l.status)).length,
    closed: allLeads.filter((l) => CLOSED.includes(l.status)).length,
  };

  const now = getServerNow();

  return (
    <>
      <PublicTopbar activeHref="/enquiries" />
      <div className="mx-auto max-w-[900px] px-10 py-7 max-[900px]:px-4">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">My enquiries</h1>
          <p className="text-sm text-text-grey">Track every enquiry you&apos;ve sent and how vendors are responding</p>
        </div>

        <div className="mb-5.5 flex flex-wrap gap-2">
          {(
            [
              ["all", `All (${counts.all})`],
              ["awaiting", `Awaiting response (${counts.awaiting})`],
              ["conversation", `In conversation (${counts.conversation})`],
              ["closed", `Closed (${counts.closed})`],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={value === "all" ? "/enquiries" : `/enquiries?tab=${value}`}
              className={`rounded-full px-4 py-2 text-[13px] font-bold no-underline ${
                tab === value ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {visibleLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
            <h3 className="mb-1.5 text-[15px] font-bold">No enquiries here yet</h3>
            <p className="mb-4 max-w-[320px] text-[13px] text-text-grey">
              Enquiries you send to vendors will show up here.
            </p>
            <Link href="/search" className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white no-underline">
              Find vendors
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {visibleLeads.map((lead) => {
              const badge = statusBadge(lead.status);
              const meta: string[] = [`Sent ${formatRelativeTime(lead.createdAt, now)}`];
              if (lead.enquiry.weddingDate) {
                meta.push(`Wedding date: ${new Date(lead.enquiry.weddingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
              }
              if (lead.enquiry.budget) {
                meta.push(`Budget ₹${Number(lead.enquiry.budget).toLocaleString("en-IN")}`);
              }

              return (
                <div key={lead.id} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4.5 max-[700px]:flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                      {lead.vendor.businessName}
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </h3>
                    <p className="text-xs text-text-grey">{meta.join(" · ")}</p>
                    <LeadStatusTrack status={lead.status} />
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    {lead.status === "WON" && (
                      <Link
                        href={`/reviews/write?vendor=${lead.vendor.slug}`}
                        className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-text-dark no-underline hover:bg-surface-input"
                      >
                        Write a review
                      </Link>
                    )}
                    <Link
                      href={`/vendors/${lead.vendor.slug}`}
                      className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-text-dark no-underline hover:bg-surface-input"
                    >
                      View vendor
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <PublicFooter />
      <CoupleBottomNav activeHref="/enquiries" />
    </>
  );
}
