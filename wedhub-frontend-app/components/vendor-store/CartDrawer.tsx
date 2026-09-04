"use client";

import { useState } from "react";
import { createPublicStoreOrder } from "@/lib/api/vendor-store-client";
import type { VendorStoreItem } from "@/lib/api/vendor-store.types";

export interface CartItem {
  item: VendorStoreItem;
  quantity: number;
  customizationNotes?: string;
}

export function CartDrawer({
  isOpen,
  onClose,
  storeSlug,
  storeName,
  minOrderValue,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  storeName: string;
  minOrderValue?: number | null;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [pincode, setPincode] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderNumber: string;
    whatsappUrl: string;
  } | null>(null);

  if (!isOpen) return null;

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, ci) => sum + ci.item.price * ci.quantity,
    0,
  );

  const gstTotal = cart.reduce((sum, ci) => {
    const itemSub = ci.item.price * ci.quantity;
    return sum + (itemSub * ci.item.gstRate) / 100;
  }, 0);

  const grandTotal = Math.round(subtotal + gstTotal);

  const belowMinOrder =
    minOrderValue && minOrderValue > 0 && grandTotal < minOrderValue;

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg("Please enter your phone number");
      return;
    }
    if (belowMinOrder) {
      setErrorMsg(
        `Minimum order amount for this store is ₹${minOrderValue}. Please add more items to proceed.`,
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await createPublicStoreOrder(storeSlug, {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || null,
      shippingAddress: shippingAddress.trim() || null,
      city: city.trim() || null,
      customerState: customerState.trim() || null,
      pincode: pincode.trim() || null,
      eventDate: eventDate ? new Date(eventDate).toISOString() : null,
      notes: notes.trim() || null,
      items: cart.map((ci) => ({
        itemId: ci.item.id,
        quantity: ci.quantity,
        customizationNotes: ci.customizationNotes || null,
      })),
    });

    setSubmitting(false);

    if (!res.success) {
      setErrorMsg(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to place order. Please try again.",
      );
      return;
    }

    const { orderNumber, whatsappUrl } = res.data;

    // Open WhatsApp in a new tab
    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank");
    }

    // Set confirmed state and clear cart
    setOrderConfirmed({ orderNumber, whatsappUrl });
    onClearCart();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h2 className="text-base font-bold text-text-dark">
                Your Order Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)})
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text-grey hover:bg-surface-input hover:text-text-dark"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {orderConfirmed ? (
            /* Order Confirmed View */
            <div className="p-6 text-center my-auto">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-dark">Order Placed Successfully!</h3>
              <p className="mt-2 text-xs text-text-grey">
                Your order has been registered under order number:
              </p>
              <div className="mt-2 text-base font-mono font-bold text-brand-primary bg-surface-input py-2 px-4 rounded-lg inline-block">
                #{orderConfirmed.orderNumber}
              </div>
              <p className="mt-3 text-xs text-text-grey leading-relaxed">
                A WhatsApp chat with <strong>{storeName}</strong> was opened to send your item details directly.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <a
                  href={orderConfirmed.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.396C8.423 21.49 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.67 0-3.23-.52-4.52-1.41l-.32-.22-2.96.83.83-2.89-.23-.33C3.84 14.88 3.3 13.48 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" />
                  </svg>
                  Re-open WhatsApp Chat
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setOrderConfirmed(null);
                    onClose();
                  }}
                  className="w-full rounded-lg border border-border bg-white py-2.5 text-xs font-bold text-text-dark hover:bg-surface-input"
                >
                  Close & Continue Browsing
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            /* Empty Cart */
            <div className="p-8 text-center my-auto">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-input flex items-center justify-center text-2xl mb-3">
                🛒
              </div>
              <h3 className="text-sm font-bold text-text-dark">Your cart is empty</h3>
              <p className="mt-1 text-xs text-text-grey">
                Browse the catalog and add products to start your order.
              </p>
            </div>
          ) : (
            /* Items and Checkout Form */
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {errorMsg && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                  {errorMsg}
                </div>
              )}

              {/* Cart Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-text-grey uppercase tracking-wider">
                  Selected Items
                </h3>
                {cart.map(({ item, quantity }) => {
                  const primaryMedia = item.media && item.media[0];
                  const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 bg-white"
                    >
                      <div className="h-14 w-14 rounded-md border border-border overflow-hidden bg-surface-input flex-shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm">🎁</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-text-dark truncate">{item.title}</h4>
                        <div className="text-xs font-semibold text-text-dark mt-0.5">
                          ₹{item.price.toLocaleString("en-IN")}
                          <span className="text-[10px] text-text-grey font-normal ml-1">(+{item.gstRate}% GST)</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center rounded border border-border bg-surface-input">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                              className="px-2 py-0.5 text-xs text-text-dark hover:bg-white"
                            >
                              -
                            </button>
                            <span className="px-2 py-0.5 text-xs font-bold text-text-dark">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                              className="px-2 py-0.5 text-xs text-text-dark hover:bg-white"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-[11px] text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="text-right text-xs font-bold text-text-dark">
                        ₹{(item.price * quantity).toLocaleString("en-IN")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="rounded-lg bg-surface-input/70 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-text-grey">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-text-grey">
                  <span>Estimated GST</span>
                  <span>₹{gstTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm text-text-dark">
                  <span>Total Amount</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {belowMinOrder && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                  ⚠️ Minimum order value for this store is ₹{minOrderValue}. Add items worth ₹
                  {minOrderValue! - grandTotal} more to place order.
                </div>
              )}

              {/* Customer Contact & Delivery Form */}
              <form onSubmit={handlePlaceOrder} className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-text-grey uppercase tracking-wider">
                  Contact & Delivery Details
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-text-grey mb-1">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-grey mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Street, apartment / building name"
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Kochi"
                      className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">State</label>
                    <input
                      type="text"
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      placeholder="Kerala"
                      className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="682011"
                      className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-grey mb-1">
                    Wedding / Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-grey mb-1">
                    Customization Notes / Special Requests
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Color preferences, delivery timing, special instructions..."
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || belowMinOrder || cart.length === 0}
                    className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.476-.15-.676.15-.2.3-.777.978-.952 1.179-.176.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.494-.894-.798-1.498-1.783-1.673-2.084-.176-.3-.019-.463.132-.613.136-.134.301-.351.451-.527.151-.176.201-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.633-.927-2.235-.244-.585-.492-.506-.677-.515-.175-.009-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.3-1.053 1.029-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.278.496 1.716.634.721.229 1.378.196 1.898.119.58-.087 1.78-.727 2.03-1.429.251-.702.251-1.303.176-1.429-.076-.125-.276-.2-.577-.35z" />
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.396C8.423 21.49 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.67 0-3.23-.52-4.52-1.41l-.32-.22-2.96.83.83-2.89-.23-.33C3.84 14.88 3.3 13.48 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" />
                    </svg>
                    {submitting ? "Placing Order…" : `Place Order on WhatsApp (₹${grandTotal.toLocaleString("en-IN")})`}
                  </button>
                  <p className="mt-1 text-center text-[10px] text-text-grey">
                    Instant order number generated. Chat directly with vendor to finalize and pay.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
