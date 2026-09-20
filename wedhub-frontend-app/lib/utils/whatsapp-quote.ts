/**
 * Generates an elegant, high-converting WhatsApp message and click-to-chat link
 * for sharing a branded quotation with a couple.
 */
export function formatQuotationWhatsAppMessage(quote: {
  quotationNumber: string;
  clientName: string;
  clientPhone?: string | null;
  vendorBusinessName: string;
  title: string;
  grandTotal: number;
  validUntil?: string | null;
  currency?: string;
  viewToken: string;
  items?: Array<{ name: string; inclusions?: string[]; total: number }>;
}): { message: string; url: string | null } {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://itsmykalyanam.com";
  const publicUrl = `${origin}/quotes/${quote.viewToken}`;

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: quote.currency || "INR",
    maximumFractionDigits: 0,
  }).format(quote.grandTotal);

  const validStr = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const packageLines = quote.items && quote.items.length > 0
    ? quote.items
        .slice(0, 4)
        .map((it) => `• *${it.name}*`)
        .join("\n")
    : null;

  const lines = [
    `✨ *Wedding Services Proposal from ${quote.vendorBusinessName}* ✨`,
    ``,
    `Hi ${quote.clientName.trim()},`,
    `Thank you for reaching out! We are delighted to share our customized proposal for your wedding.`,
    ``,
    `📋 *Proposal:* ${quote.title}`,
    `🔢 *Quote Ref:* #${quote.quotationNumber}`,
    ...(packageLines ? [``, `*Services Included:*`, packageLines] : []),
    ``,
    `💰 *Total Investment:* ${formattedAmount}`,
    ...(validStr ? [`⏳ *Valid Until:* ${validStr}`] : []),
    ``,
    `🔗 *View Full Interactive Proposal & Inclusions:*`,
    publicUrl,
    ``,
    `You can view deliverables, download the PDF, or accept directly from the link above. Please feel free to reply here if you'd like any customizations!`,
    ``,
    `Warm regards,`,
    `*${quote.vendorBusinessName}*`,
  ];

  const message = lines.join("\n");

  if (!quote.clientPhone) {
    return { message, url: null };
  }

  const digits = quote.clientPhone.replace(/\D/g, "");
  let cleanPhone = digits;
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
    cleanPhone = `91${cleanPhone.slice(1)}`;
  }

  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : null;

  return { message, url };
}
