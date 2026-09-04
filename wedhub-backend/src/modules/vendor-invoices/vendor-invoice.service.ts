import type { VendorInvoiceStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import * as vendorRepository from "../vendors/vendor.repository";
import * as invoiceRepository from "./vendor-invoice.repository";
import type {
  CreateVendorInvoiceInput,
  InvoiceItemInput,
  ListInvoicesFilters,
  RecordPaymentInput,
  UpdateVendorInvoiceInput,
  UpsertBillingProfileInput,
} from "./vendor-invoice.types";

export function formatIndianCurrencyWords(amount: number): string {
  if (amount === 0) return "Rupees Zero Only";

  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(num: number): string {
    if (num < 10) return singleDigits[num] ?? "";
    if (num < 20) return teens[num - 10] ?? "";
    const unit = num % 10;
    const tenWord = tens[Math.floor(num / 10)] ?? "";
    return tenWord + (unit ? ` ${singleDigits[unit] ?? ""}` : "");
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = "";
    if (hundred) res += `${singleDigits[hundred] ?? ""} Hundred`;
    if (hundred && rest) res += " and ";
    if (rest) res += convertTwoDigits(rest);
    return res;
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let num = integerPart;
  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  const hundreds = num;

  const parts: string[] = [];
  if (crores > 0) parts.push(`${convertTwoDigits(crores)} Crore`);
  if (lakhs > 0) parts.push(`${convertTwoDigits(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${convertTwoDigits(thousands)} Thousand`);
  if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

  let words = `Rupees ${parts.join(" ")}`.trim();
  if (decimalPart > 0) {
    words += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }
  return `${words} Only`;
}

export function computeGstItem(
  item: InvoiceItemInput,
  isInterState: boolean,
  order: number,
) {
  const qty = item.quantity;
  const price = item.unitPrice;
  const discount = Number((item.discount || 0).toFixed(2));
  const gross = Number((qty * price).toFixed(2));
  const taxable = Number((gross - discount).toFixed(2));
  const gstRate = item.gstRate;

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = gstRate;
    igstAmount = Number((taxable * (igstRate / 100)).toFixed(2));
  } else {
    cgstRate = Number((gstRate / 2).toFixed(2));
    cgstAmount = Number((taxable * (cgstRate / 100)).toFixed(2));
    sgstRate = Number((gstRate / 2).toFixed(2));
    sgstAmount = Number((taxable * (sgstRate / 100)).toFixed(2));
  }

  const totalAmount = Number((taxable + cgstAmount + sgstAmount + igstAmount).toFixed(2));

  return {
    itemOrder: order,
    description: item.description,
    sacCode: item.sacCode || null,
    quantity: qty,
    unit: item.unit || "Session",
    unitPrice: price,
    discount,
    taxableAmount: taxable,
    gstRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalAmount,
  };
}

export function calculateFinancials(
  computedItems: ReturnType<typeof computeGstItem>[],
) {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  for (const item of computedItems) {
    subtotal += Number((item.quantity * item.unitPrice).toFixed(2));
    totalDiscount += item.discount;
    taxableAmount += item.taxableAmount;
    cgstAmount += item.cgstAmount;
    sgstAmount += item.sgstAmount;
    igstAmount += item.igstAmount;
  }

  subtotal = Number(subtotal.toFixed(2));
  totalDiscount = Number(totalDiscount.toFixed(2));
  taxableAmount = Number(taxableAmount.toFixed(2));
  cgstAmount = Number(cgstAmount.toFixed(2));
  sgstAmount = Number(sgstAmount.toFixed(2));
  igstAmount = Number(igstAmount.toFixed(2));
  const totalTax = Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));

  const grossTotal = Number((taxableAmount + totalTax).toFixed(2));
  const grandTotal = Math.round(grossTotal);
  const roundOffAmount = Number((grandTotal - grossTotal).toFixed(2));
  const amountInWords = formatIndianCurrencyWords(grandTotal);

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    roundOffAmount,
    grandTotal,
    amountInWords,
  };
}

export async function getBillingProfile(vendorId: string) {
  const profile = await invoiceRepository.findBillingProfile(vendorId);
  if (!profile) {
    return {
      vendorId,
      legalName: null,
      tradeName: null,
      gstin: null,
      pan: null,
      address: null,
      city: null,
      state: null,
      stateCode: null,
      pincode: null,
      phone: null,
      email: null,
      bankName: null,
      accountName: null,
      accountNumber: null,
      ifscCode: null,
      upiId: null,
      invoicePrefix: "INV",
      defaultNotes: "Thank you for trusting us with your celebration!",
      defaultTerms: "1. 50% advance payment required to lock event dates.\n2. Balance must be cleared on or before the event date.\n3. Standard cancellation policies apply.",
    };
  }
  return profile;
}

export async function upsertBillingProfile(vendorId: string, input: UpsertBillingProfileInput) {
  return invoiceRepository.upsertBillingProfile(vendorId, input);
}

export async function listInvoices(vendorId: string, filters: ListInvoicesFilters) {
  return invoiceRepository.findInvoices(vendorId, filters);
}

export async function getMetrics(vendorId: string) {
  return invoiceRepository.getMetrics(vendorId);
}

export async function getInvoiceById(vendorId: string, invoiceId: string) {
  const invoice = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }
  return invoice;
}

export async function createInvoice(
  vendorId: string,
  userId: string,
  input: CreateVendorInvoiceInput,
) {
  const vendor = await vendorRepository.findVendorById(vendorId);
  if (!vendor) throw new NotFoundError("Vendor not found");

  const billingProfile = await getBillingProfile(vendorId);
  const logoKey = vendor.profile?.logoMedia?.optimizedObjectKey ?? vendor.profile?.logoMedia?.originalObjectKey ?? null;

  const sellerStateCode = (billingProfile.stateCode || "").trim();
  const clientStateCode = (input.clientStateCode || "").trim();
  const isInterState = Boolean(sellerStateCode && clientStateCode && sellerStateCode !== clientStateCode);

  const computedItems = input.items.map((item, idx) => computeGstItem(item, isInterState, idx + 1));
  const financials = calculateFinancials(computedItems);

  const year = new Date(input.issueDate).getFullYear();

  return prisma.$transaction(async (tx) => {
    // Transaction-safe atomic invoice numbering with row lock
    const currentProfile = await tx.vendorBillingProfile.upsert({
      where: { vendorId },
      create: {
        vendorId,
        invoicePrefix: "INV",
        nextInvoiceNumber: 2,
      },
      update: {
        nextInvoiceNumber: { increment: 1 },
      },
    });

    const sequenceNum = currentProfile.nextInvoiceNumber - 1;
    const prefix = currentProfile.invoicePrefix || "INV";
    const invoiceNumber = `${prefix}-${year}-${String(sequenceNum).padStart(4, "0")}`;

    const created = await tx.vendorInvoice.create({
      data: {
        vendorId,
        leadId: input.leadId || null,
        invoiceNumber,
        status: "DRAFT",
        issueDate: new Date(input.issueDate),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        sellerBusinessName: vendor.businessName,
        sellerLegalName: billingProfile.legalName || vendor.businessName,
        sellerGstin: billingProfile.gstin || null,
        sellerPan: billingProfile.pan || null,
        sellerAddress: billingProfile.address || null,
        sellerCity: billingProfile.city || null,
        sellerState: billingProfile.state || null,
        sellerStateCode: billingProfile.stateCode || null,
        sellerPhone: billingProfile.phone || vendor.profile?.phone || null,
        sellerEmail: billingProfile.email || vendor.profile?.email || null,
        sellerLogoKey: logoKey,
        clientName: input.clientName,
        clientPhone: input.clientPhone || null,
        clientEmail: input.clientEmail || null,
        clientAddress: input.clientAddress || null,
        clientCity: input.clientCity || null,
        clientState: input.clientState || null,
        clientStateCode: input.clientStateCode || null,
        clientGstin: input.clientGstin || null,
        placeOfSupply: input.placeOfSupply,
        isInterState,
        currency: "INR",
        subtotal: financials.subtotal,
        totalDiscount: financials.totalDiscount,
        taxableAmount: financials.taxableAmount,
        cgstAmount: financials.cgstAmount,
        sgstAmount: financials.sgstAmount,
        igstAmount: financials.igstAmount,
        totalTax: financials.totalTax,
        roundOffAmount: financials.roundOffAmount,
        grandTotal: financials.grandTotal,
        amountInWords: financials.amountInWords,
        paidAmount: 0,
        balanceDue: financials.grandTotal,
        bankName: input.bankName || billingProfile.bankName || null,
        accountName: input.accountName || billingProfile.accountName || null,
        accountNumber: input.accountNumber || billingProfile.accountNumber || null,
        ifscCode: input.ifscCode || billingProfile.ifscCode || null,
        upiId: input.upiId || billingProfile.upiId || null,
        notes: input.notes !== undefined ? input.notes : billingProfile.defaultNotes || null,
        terms: input.terms !== undefined ? input.terms : billingProfile.defaultTerms || null,
        items: {
          create: computedItems,
        },
        activities: {
          create: {
            action: "CREATED",
            performedBy: userId,
            metadata: { invoiceNumber, grandTotal: financials.grandTotal },
          },
        },
      },
      include: invoiceRepository.INVOICE_FULL_INCLUDE,
    });

    return created;
  });
}

export async function updateInvoice(
  vendorId: string,
  userId: string,
  invoiceId: string,
  input: UpdateVendorInvoiceInput,
) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  if (existing.status !== "DRAFT") {
    throw new ConflictError(`Cannot edit invoice with status ${existing.status}. Only DRAFT invoices can be edited.`);
  }

  const sellerStateCode = existing.sellerStateCode || "";
  const clientStateCode = (input.clientStateCode !== undefined ? input.clientStateCode : existing.clientStateCode) || "";
  const isInterState = Boolean(sellerStateCode && clientStateCode && sellerStateCode !== clientStateCode);

  let itemsData: ReturnType<typeof computeGstItem>[] | undefined;
  let financials: ReturnType<typeof calculateFinancials> | undefined;

  if (input.items) {
    itemsData = input.items.map((item, idx) => computeGstItem(item, isInterState, idx + 1));
    financials = calculateFinancials(itemsData);
  }

  return prisma.$transaction(async (tx) => {
    if (itemsData) {
      await tx.vendorInvoiceItem.deleteMany({ where: { invoiceId } });
    }

    const updateFields = omitUndefined({
      issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
      dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      clientAddress: input.clientAddress,
      clientCity: input.clientCity,
      clientState: input.clientState,
      clientStateCode: input.clientStateCode,
      clientGstin: input.clientGstin,
      placeOfSupply: input.placeOfSupply,
      isInterState: input.items || input.clientStateCode !== undefined ? isInterState : undefined,
      subtotal: financials ? financials.subtotal : undefined,
      totalDiscount: financials ? financials.totalDiscount : undefined,
      taxableAmount: financials ? financials.taxableAmount : undefined,
      cgstAmount: financials ? financials.cgstAmount : undefined,
      sgstAmount: financials ? financials.sgstAmount : undefined,
      igstAmount: financials ? financials.igstAmount : undefined,
      totalTax: financials ? financials.totalTax : undefined,
      roundOffAmount: financials ? financials.roundOffAmount : undefined,
      grandTotal: financials ? financials.grandTotal : undefined,
      amountInWords: financials ? financials.amountInWords : undefined,
      balanceDue: financials ? Number((financials.grandTotal - Number(existing.paidAmount)).toFixed(2)) : undefined,
      bankName: input.bankName,
      accountName: input.accountName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      upiId: input.upiId,
      notes: input.notes,
      terms: input.terms,
      items: itemsData ? { create: itemsData } : undefined,
    });

    const updated = await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        ...updateFields,
        activities: {
          create: {
            action: "UPDATED",
            performedBy: userId,
            metadata: { updatedFields: Object.keys(input) },
          },
        },
      },
      include: invoiceRepository.INVOICE_FULL_INCLUDE,
    });

    return updated;
  });
}

export async function deleteInvoice(vendorId: string, invoiceId: string) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  if (existing.status !== "DRAFT") {
    throw new ConflictError(`Cannot delete invoice with status ${existing.status}. Only DRAFT invoices can be deleted.`);
  }

  await prisma.vendorInvoice.delete({
    where: { id: invoiceId },
  });

  return { success: true };
}

export async function issueInvoice(vendorId: string, userId: string, invoiceId: string) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  if (existing.status !== "DRAFT") {
    throw new ConflictError(`Invoice is already in ${existing.status} status`);
  }

  return prisma.vendorInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "ISSUED",
      activities: {
        create: {
          action: "ISSUED",
          performedBy: userId,
          metadata: { issuedAt: new Date().toISOString() },
        },
      },
    },
    include: invoiceRepository.INVOICE_FULL_INCLUDE,
  });
}

export async function cancelInvoice(
  vendorId: string,
  userId: string,
  invoiceId: string,
  reason?: string,
) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  if (existing.status === "CANCELLED") {
    throw new ConflictError("Invoice is already cancelled");
  }

  return prisma.vendorInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      activities: {
        create: {
          action: "CANCELLED",
          performedBy: userId,
          metadata: { reason: reason || "Cancelled by vendor" },
        },
      },
    },
    include: invoiceRepository.INVOICE_FULL_INCLUDE,
  });
}

export async function duplicateInvoice(vendorId: string, userId: string, invoiceId: string) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  const todayStr = new Date().toISOString().split("T")[0] ?? "";
  const itemsInput: InvoiceItemInput[] = existing.items.map((it) => ({
    description: it.description,
    sacCode: it.sacCode,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unitPrice),
    discount: Number(it.discount),
    gstRate: Number(it.gstRate),
  }));

  const created = await createInvoice(vendorId, userId, {
    leadId: existing.leadId,
    issueDate: todayStr,
    dueDate: existing.dueDate ? (new Date(existing.dueDate).toISOString().split("T")[0] ?? null) : null,
    clientName: existing.clientName,
    clientPhone: existing.clientPhone,
    clientEmail: existing.clientEmail,
    clientAddress: existing.clientAddress,
    clientCity: existing.clientCity,
    clientState: existing.clientState,
    clientStateCode: existing.clientStateCode,
    clientGstin: existing.clientGstin,
    placeOfSupply: existing.placeOfSupply,
    items: itemsInput,
    notes: existing.notes,
    terms: existing.terms,
    bankName: existing.bankName,
    accountName: existing.accountName,
    accountNumber: existing.accountNumber,
    ifscCode: existing.ifscCode,
    upiId: existing.upiId,
  });

  await prisma.vendorInvoiceActivity.create({
    data: {
      invoiceId: created.id,
      action: "DUPLICATED",
      performedBy: userId,
      metadata: { originalInvoiceId: invoiceId, originalInvoiceNumber: existing.invoiceNumber },
    },
  });

  return created;
}

export async function recordPayment(
  vendorId: string,
  userId: string,
  invoiceId: string,
  input: RecordPaymentInput,
) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  if (existing.status === "CANCELLED") {
    throw new ConflictError("Cannot record payment for a cancelled invoice");
  }

  const currentBalance = Number(existing.balanceDue);
  const paymentAmount = Number(input.amount.toFixed(2));

  if (paymentAmount > currentBalance + 0.01) {
    throw new ValidationError(
      `Payment amount (₹${paymentAmount.toLocaleString("en-IN")}) exceeds outstanding balance (₹${currentBalance.toLocaleString("en-IN")})`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.vendorInvoicePayment.create({
      data: {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: input.paymentMethod,
        transactionReference: input.transactionReference || null,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        notes: input.notes || null,
      },
    });

    const allPayments = await tx.vendorInvoicePayment.findMany({
      where: { invoiceId },
    });

    const newPaidTotal = Number(
      allPayments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2),
    );
    const grandTotal = Number(existing.grandTotal);
    const newBalanceDue = Math.max(0, Number((grandTotal - newPaidTotal).toFixed(2)));
    const newStatus: VendorInvoiceStatus = newBalanceDue <= 0.01 ? "PAID" : "ISSUED";

    const updated = await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidTotal,
        balanceDue: newBalanceDue,
        status: newStatus,
        activities: {
          create: {
            action: "PAYMENT_RECORDED",
            performedBy: userId,
            metadata: {
              paymentId: payment.id,
              amount: paymentAmount,
              method: input.paymentMethod,
              balanceDue: newBalanceDue,
            },
          },
        },
      },
      include: invoiceRepository.INVOICE_FULL_INCLUDE,
    });

    return updated;
  });
}

export async function deletePayment(
  vendorId: string,
  userId: string,
  invoiceId: string,
  paymentId: string,
) {
  const existing = await invoiceRepository.findInvoiceById(vendorId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  const payment = existing.payments.find((p) => p.id === paymentId);
  if (!payment) throw new NotFoundError("Payment record not found");

  return prisma.$transaction(async (tx) => {
    await tx.vendorInvoicePayment.delete({
      where: { id: paymentId },
    });

    const remainingPayments = await tx.vendorInvoicePayment.findMany({
      where: { invoiceId },
    });

    const newPaidTotal = Number(
      remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2),
    );
    const grandTotal = Number(existing.grandTotal);
    const newBalanceDue = Math.max(0, Number((grandTotal - newPaidTotal).toFixed(2)));
    const newStatus: VendorInvoiceStatus =
      existing.status === "CANCELLED"
        ? "CANCELLED"
        : newBalanceDue <= 0.01
          ? "PAID"
          : "ISSUED";

    const updated = await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidTotal,
        balanceDue: newBalanceDue,
        status: newStatus,
        activities: {
          create: {
            action: "PAYMENT_DELETED",
            performedBy: userId,
            metadata: {
              deletedPaymentId: paymentId,
              reversedAmount: Number(payment.amount),
              newBalanceDue,
            },
          },
        },
      },
      include: invoiceRepository.INVOICE_FULL_INCLUDE,
    });

    return updated;
  });
}

export async function getLeadPrefill(vendorId: string, leadId: string) {
  const lead = await invoiceRepository.findLeadForPrefill(vendorId, leadId);
  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  const enq = lead.enquiry;
  return {
    leadId: lead.id,
    clientName: enq.contactName,
    clientPhone: enq.contactPhone,
    clientEmail: enq.contactEmail,
    eventDate: enq.weddingDate ? (enq.weddingDate.toISOString().split("T")[0] ?? null) : null,
    eventLocation: enq.weddingLocation,
    budget: enq.budget ? Number(enq.budget) : null,
    notes: enq.message ? `Enquiry message: ${enq.message}` : null,
  };
}
