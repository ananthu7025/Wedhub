"use client";

import { formatWhatsAppUrl } from "@/lib/utils/whatsapp";

interface FloatingWhatsAppButtonProps {
  phone?: string | null;
  businessName: string;
}

export function FloatingWhatsAppButton({ phone, businessName }: FloatingWhatsAppButtonProps) {
  const whatsappUrl = formatWhatsAppUrl(phone, businessName);

  if (!whatsappUrl) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:bg-[#20ba5a] hover:scale-105 active:scale-95 focus:outline-hidden"
        aria-label="Direct WhatsApp Enquiry"
      >
        {/* Pulsing ring indicator */}
        <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-[#25D366]/40 opacity-75 duration-1000" />

        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
        </svg>

        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:opacity-100 sm:max-w-xs sm:opacity-100">
          Chat with {businessName.split(" ")[0]}
        </span>
      </a>
    </div>
  );
}
