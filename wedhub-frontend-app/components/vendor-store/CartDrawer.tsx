"use client";

import { useState, useEffect } from "react";
import { createPublicStoreOrder } from "@/lib/api/vendor-store-client";
import { verifyStoreOrderPayment } from "@/lib/api/vendor-payments-client";
import type { VendorStoreItem } from "@/lib/api/vendor-store.types";

export interface CartItem {
  item: VendorStoreItem;
  quantity: number;
  customizationNotes?: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay: unknown }).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CartDrawer({
  isOpen,
  onClose,
  storeSlug,
  storeName,
  minOrderValue,
  isOnlinePaymentEnabled = false,
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
  isOnlinePaymentEnabled?: boolean;
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
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "WHATSAPP">(
    isOnlinePaymentEnabled ? "ONLINE" : "WHATSAPP",
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderNumber: string;
    whatsappUrl?: string;
    paymentMethod: "ONLINE" | "WHATSAPP";
    paymentId?: string;
  } | null>(null);

  useEffect(() => {
    if (isOnlinePaymentEnabled) {
      setPaymentMethod("ONLINE");
    } else {
      setPaymentMethod("WHATSAPP");
    }
  }, [isOnlinePaymentEnabled]);

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
    if (paymentMethod === "ONLINE" && !customerEmail.trim()) {
      setErrorMsg("Please enter your email address for online payment receipt");
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
      paymentMethod,
      items: cart.map((ci) => ({
        itemId: ci.item.id,
        quantity: ci.quantity,
        customizationNotes: ci.customizationNotes || null,
      })),
    });

    if (!res.success) {
      setSubmitting(false);
      setErrorMsg(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to place order. Please try again.",
      );
      return;
    }

    const { orderId, orderNumber, whatsappUrl, razorpayOrderId, keyId } = res.data;

    // If ONLINE payment selected and gateway order returned:
    if (paymentMethod === "ONLINE" && razorpayOrderId && keyId) {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setSubmitting(false);
        setErrorMsg("Failed to load payment gateway. Please try paying via WhatsApp or disable adblock.");
        return;
      }

      type RazorpaySuccessHandler = (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => Promise<void>;

      interface RazorpayInstance {
        open: () => void;
        on: (event: string, handler: () => void) => void;
      }

      const RazorpayConstructor = (window as unknown as {
        Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;
      }).Razorpay;

      const rzp = new RazorpayConstructor({
        key: keyId,
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        name: storeName,
        description: `Order #${orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: customerName.trim(),
          contact: customerPhone.trim(),
          email: customerEmail.trim(),
        },
        theme: {
          color: "#E11D48",
        },
        handler: (async (response) => {
          try {
            const verifyRes = await verifyStoreOrderPayment(storeSlug, orderId, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });

            setSubmitting(false);
            if (verifyRes.success) {
              setOrderConfirmed({
                orderNumber,
                whatsappUrl,
                paymentMethod: "ONLINE",
                paymentId: response.razorpay_payment_id,
              });
              onClearCart();
            } else {
              setErrorMsg("Payment completed, but verification pending. Please contact vendor on WhatsApp.");
            }
          } catch {
            setSubmitting(false);
            setErrorMsg("Error verifying payment. If funds were deducted, please message the vendor with your transaction ID.");
          }
        }) as RazorpaySuccessHandler,
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setErrorMsg("Payment was not completed. You can try again or switch to WhatsApp order.");
          },
        },
      });

      rzp.open();
      return;
    }

    // WHATSAPP flow:
    setSubmitting(false);
    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank");
    }

    setOrderConfirmed({
      orderNumber,
      whatsappUrl,
      paymentMethod: "WHATSAPP",
    });
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
              <h3 className="text-lg font-bold text-text-dark">
                {orderConfirmed.paymentMethod === "ONLINE" ? "Payment Successful & Order Confirmed!" : "Order Placed Successfully!"}
              </h3>
              <p className="mt-2 text-xs text-text-grey">
                Your order has been registered under order number:
              </p>
              <div className="mt-2 text-base font-mono font-bold text-brand-primary bg-surface-input py-2 px-4 rounded-lg inline-block">
                #{orderConfirmed.orderNumber}
              </div>

              {orderConfirmed.paymentId && (
                <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-md">
                  <span className="font-semibold">Razorpay Transaction ID:</span> {orderConfirmed.paymentId}
                </div>
              )}

              <p className="mt-3 text-xs text-text-grey leading-relaxed">
                {orderConfirmed.paymentMethod === "ONLINE"
                  ? `Payment of ₹${grandTotal.toLocaleString("en-IN")} has been verified and settled directly to ${storeName}.`
                  : `A WhatsApp chat with ${storeName} was opened to send your item details directly.`}
              </p>

              <div className="mt-6 flex flex-col gap-2">
                {orderConfirmed.whatsappUrl && (
                  <a
                    href={orderConfirmed.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.396C8.423 21.49 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.67 0-3.23-.52-4.52-1.41l-.32-.22-2.96.83.83-2.89-.23-.33C3.84 14.88 3.3 13.48 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" />
                    </svg>
                    Re-open WhatsApp Chat
                  </a>
                )}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Cart Items List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-grey">
                  Selected Items
                </h3>
                {cart.map((ci) => {
                  const itemSubtotal = ci.item.price * ci.quantity;
                  const itemGst = (itemSubtotal * ci.item.gstRate) / 100;
                  const itemTotal = itemSubtotal + itemGst;

                  return (
                    <div
                      key={ci.item.id}
                      className="rounded-xl border border-border p-3 bg-surface-card flex gap-3 items-start"
                    >
                      <div className="h-12 w-12 rounded-lg bg-surface-input flex-shrink-0 overflow-hidden relative">
                        {ci.item.media?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ci.item.media[0].url}
                            alt={ci.item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-text-grey text-xs">
                            🛍️
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-text-dark truncate">
                            {ci.item.title}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(ci.item.id)}
                            className="text-text-grey hover:text-red-500 p-0.5 ml-1"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-semibold text-brand-primary">
                            ₹{Math.round(itemTotal).toLocaleString("en-IN")}
                          </span>
                          <div className="flex items-center border border-border rounded-md bg-white">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(ci.item.id, ci.quantity - 1)}
                              className="px-2 py-0.5 text-xs text-text-grey hover:bg-surface-input rounded-l"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-medium">{ci.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(ci.item.id, ci.quantity + 1)}
                              className="px-2 py-0.5 text-xs text-text-grey hover:bg-surface-input rounded-r"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {ci.customizationNotes && (
                          <p className="mt-1 text-[10px] text-text-grey italic truncate">
                            Note: {ci.customizationNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="rounded-xl border border-border bg-surface-card p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-text-grey">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {gstTotal > 0 && (
                  <div className="flex justify-between text-text-grey">
                    <span>Estimated GST</span>
                    <span>₹{Math.round(gstTotal).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-text-dark text-sm">
                  <span>Total Amount</span>
                  <span className="text-brand-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
                {belowMinOrder && (
                  <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⚠️ Minimum order amount is ₹{minOrderValue}. Add ₹{(minOrderValue - grandTotal).toLocaleString("en-IN")} more to place order.
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-grey">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isOnlinePaymentEnabled) setPaymentMethod("ONLINE");
                    }}
                    disabled={!isOnlinePaymentEnabled}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      !isOnlinePaymentEnabled
                        ? "opacity-50 border-dashed border-border bg-surface-card cursor-not-allowed"
                        : paymentMethod === "ONLINE"
                        ? "border-brand-primary bg-brand-primary/5 text-text-dark ring-1 ring-brand-primary shadow-xs"
                        : "border-border bg-surface-card text-text-grey hover:border-brand-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className={`w-4 h-4 ${paymentMethod === "ONLINE" ? "text-brand-primary" : "text-text-grey"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-xs font-bold">Online Payment</span>
                    </div>
                    <p className="text-[10px] leading-tight text-text-grey">
                      {isOnlinePaymentEnabled ? "UPI, Cards, NetBanking" : "Not enabled by vendor"}
                    </p>
                    {isOnlinePaymentEnabled && (
                      <span className="absolute top-2 right-2 text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                        DIRECT
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("WHATSAPP")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "WHATSAPP"
                        ? "border-emerald-600 bg-emerald-50/50 text-text-dark ring-1 ring-emerald-600 shadow-xs"
                        : "border-border bg-surface-card text-text-grey hover:border-emerald-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className={`w-4 h-4 ${paymentMethod === "WHATSAPP" ? "text-emerald-600" : "text-text-grey"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.396C8.423 21.49 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.67 0-3.23-.52-4.52-1.41l-.32-.22-2.96.83.83-2.89-.23-.33C3.84 14.88 3.3 13.48 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" />
                      </svg>
                      <span className="text-xs font-bold">Via WhatsApp</span>
                    </div>
                    <p className="text-[10px] leading-tight text-text-grey">
                      Chat & Custom arrange
                    </p>
                  </button>
                </div>
              </div>

              {/* Customer Details Form */}
              <form onSubmit={handlePlaceOrder} className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-grey">
                  Your Delivery & Contact Details
                </h3>

                {errorMsg && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600 flex items-start gap-1.5">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-text-grey mb-1">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-grey mb-1">
                      Email Address {paymentMethod === "ONLINE" && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="email"
                      required={paymentMethod === "ONLINE"}
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="rahul@example.com"
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
                    placeholder="House/Apartment, Street Name"
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
                  {paymentMethod === "ONLINE" ? (
                    <button
                      type="submit"
                      disabled={submitting || belowMinOrder || cart.length === 0}
                      className="w-full rounded-lg bg-brand-primary py-3 text-sm font-bold text-white hover:bg-brand-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {submitting ? "Processing Payment…" : `Pay Securely Online (₹${grandTotal.toLocaleString("en-IN")})`}
                    </button>
                  ) : (
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
                  )}
                  <p className="mt-1.5 text-center text-[10px] text-text-grey">
                    {paymentMethod === "ONLINE"
                      ? "🔒 256-bit encrypted Razorpay Route payment. Settles directly to vendor."
                      : "Instant order number generated. Chat directly with vendor to finalize and pay."}
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
