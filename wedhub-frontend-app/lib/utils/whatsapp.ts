/**
 * Generates an international-ready WhatsApp direct click-to-chat URL.
 * Cleans punctuation/spaces and defaults 10-digit Indian numbers to country code 91.
 */
export function formatWhatsAppUrl(phone?: string | null, vendorName?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  let cleanNumber = digits;
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  } else if (cleanNumber.length === 11 && cleanNumber.startsWith("0")) {
    cleanNumber = `91${cleanNumber.slice(1)}`;
  }

  const name = vendorName?.trim() || "there";
  const message = `Hi ${name}, I saw your portfolio and would like to check your availability and pricing for my wedding!`;
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalizes phone numbers for `tel:` links.
 */
export function formatTelUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}
