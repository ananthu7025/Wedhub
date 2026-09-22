import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { omitUndefined } from "../../common/utils/object.util";
import { assertVendorFeatureAccess } from "../entitlements/entitlement.service";
import { formatIndianCurrencyWords } from "../vendor-invoices/vendor-invoice.service";
import * as quotationRepository from "./vendor-quotation.repository";
import type {
  CreateVendorQuotationInput,
  LeadQuotationPrefill,
  ListQuotationsFilters,
  QuotationItemInput,
  QuotationSummaryMetrics,
  UpdateVendorQuotationInput,
} from "./vendor-quotation.types";

export async function generateNextQuotationNumber(vendorId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const latestNumber = await quotationRepository.findLatestQuotationNumber(vendorId, currentYear);

  if (!latestNumber) {
    return `QT-${currentYear}-001`;
  }

  const parts = latestNumber.split("-");
  const lastPart = parts[parts.length - 1];
  const lastSequence = lastPart ? parseInt(lastPart, 10) : NaN;

  if (isNaN(lastSequence)) {
    return `QT-${currentYear}-001`;
  }

  const nextSeq = lastSequence + 1;
  return `QT-${currentYear}-${String(nextSeq).padStart(3, "0")}`;
}

export function calculateQuotationTotals(
  items: QuotationItemInput[],
  overallDiscount = 0,
  taxRate = 0,
) {
  let subtotal = 0;

  const processedItems = items.map((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const itemTotal = Number((qty * price - disc).toFixed(2));
    subtotal += itemTotal;

    return {
      packageId: item.packageId || null,
      itemOrder: index,
      name: item.name.trim(),
      description: item.description?.trim() || null,
      inclusions: item.inclusions || [],
      quantity: new Prisma.Decimal(qty),
      unit: item.unit?.trim() || "Package",
      unitPrice: new Prisma.Decimal(price),
      discount: new Prisma.Decimal(disc),
      total: new Prisma.Decimal(itemTotal),
    };
  });

  subtotal = Number(subtotal.toFixed(2));
  const discountVal = Number((overallDiscount || 0).toFixed(2));
  const taxable = Math.max(0, Number((subtotal - discountVal).toFixed(2)));
  const rate = Number((taxRate || 0).toFixed(2));
  const taxAmount = Number(((taxable * rate) / 100).toFixed(2));
  const grandTotal = Number((taxable + taxAmount).toFixed(2));
  const words = formatIndianCurrencyWords(grandTotal);

  return {
    subtotal: new Prisma.Decimal(subtotal),
    discount: new Prisma.Decimal(discountVal),
    taxRate: new Prisma.Decimal(rate),
    taxAmount: new Prisma.Decimal(taxAmount),
    grandTotal: new Prisma.Decimal(grandTotal),
    amountInWords: words,
    items: processedItems,
  };
}

export async function listQuotations(vendorId: string, filters: ListQuotationsFilters) {
  return quotationRepository.findQuotations(vendorId, filters);
}

export async function getQuotationById(vendorId: string, id: string) {
  const quote = await quotationRepository.findQuotationById(vendorId, id);
  if (!quote) {
    throw new NotFoundError("Quotation not found");
  }
  return quote;
}

export async function getQuotationByToken(viewToken: string) {
  const quote = await quotationRepository.findQuotationByToken(viewToken);
  if (!quote) {
    throw new NotFoundError("Quotation not found or link has expired");
  }
  return quote;
}

export async function getMetrics(vendorId: string): Promise<QuotationSummaryMetrics> {
  return quotationRepository.getQuotationMetrics(vendorId);
}

export async function getLeadPrefill(vendorId: string, leadId: string): Promise<LeadQuotationPrefill> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, vendorId },
    include: {
      enquiry: true,
    },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  const enquiry = lead.enquiry;
  return {
    leadId: lead.id,
    clientName: enquiry.contactName,
    clientPhone: enquiry.contactPhone ?? null,
    clientEmail: enquiry.contactEmail ?? null,
    eventDate: enquiry.weddingDate ? (enquiry.weddingDate.toISOString().split("T")[0] ?? null) : null,
    eventLocation: enquiry.weddingLocation ?? null,
    guestCount: enquiry.guestCount ?? null,
    budget: enquiry.budget ? Number(enquiry.budget) : null,
    notes: enquiry.message ?? null,
  };
}

export async function createQuotation(vendorId: string, input: CreateVendorQuotationInput) {
  await assertVendorFeatureAccess(vendorId, "invoicing_access", "Quotes & Invoices");
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      profile: true,
      billingProfile: true,
      categories: {
        include: { category: true },
        take: 1,
      },
    },
  });

  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }

  if (input.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, vendorId },
    });
    if (!lead) {
      throw new ValidationError("Associated lead does not exist for this vendor");
    }
  }

  const quotationNumber = await generateNextQuotationNumber(vendorId);
  const totals = calculateQuotationTotals(input.items, input.discount, input.taxRate);

  const vendorBusinessName = input.vendorBusinessName || vendor.businessName;
  const vendorCategory = input.vendorCategory || vendor.categories[0]?.category?.name || null;
  const vendorPhone = input.vendorPhone || vendor.profile?.phone || vendor.billingProfile?.phone || null;
  const vendorEmail = input.vendorEmail || vendor.profile?.email || vendor.billingProfile?.email || null;
  const vendorAddress = input.vendorAddress || vendor.billingProfile?.address || null;
  const vendorGstin = input.vendorGstin || vendor.billingProfile?.gstin || null;
  const vendorLogoKey = input.vendorLogoKey || vendor.profile?.logoMediaId || null;

  const issueDate = new Date(input.issueDate);
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  const eventDate = input.eventDate ? new Date(input.eventDate) : null;

  const quotation = await quotationRepository.createQuotation({
    vendorId,
    leadId: input.leadId || null,
    quotationNumber,
    title: input.title.trim(),
    issueDate,
    validUntil,
    eventType: input.eventType || "Wedding",
    eventDate,
    eventLocation: input.eventLocation?.trim() || null,
    guestCount: input.guestCount || null,
    clientName: input.clientName.trim(),
    clientPhone: input.clientPhone?.trim() || null,
    clientEmail: input.clientEmail?.trim() || null,
    clientAddress: input.clientAddress?.trim() || null,
    vendorBusinessName,
    vendorCategory,
    vendorPhone,
    vendorEmail,
    vendorAddress,
    vendorLogoKey,
    vendorGstin,
    brandThemeColor: input.brandThemeColor || "#E05A47",
    introduction: input.introduction?.trim() || null,
    paymentTerms: input.paymentTerms?.trim() || null,
    terms: input.terms?.trim() || null,
    notes: input.notes?.trim() || null,
    currency: input.currency || "INR",
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxRate: totals.taxRate,
    taxAmount: totals.taxAmount,
    grandTotal: totals.grandTotal,
    amountInWords: totals.amountInWords,
    items: totals.items,
  });

  if (input.leadId) {
    const currentLead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { status: true },
    });

    if (
      currentLead &&
      ["NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "MEETING"].includes(currentLead.status)
    ) {
      await prisma.lead.update({
        where: { id: input.leadId },
        data: {
          status: "QUOTED",
          statusHistory: {
            create: {
              fromStatus: currentLead.status,
              toStatus: "QUOTED",
              reason: `Quotation #${quotation.quotationNumber} created`,
            },
          },
        },
      });
    }
  }

  return quotation;
}

export async function updateQuotation(vendorId: string, id: string, input: UpdateVendorQuotationInput) {
  await assertVendorFeatureAccess(vendorId, "invoicing_access", "Quotes & Invoices");
  const existing = await quotationRepository.findQuotationById(vendorId, id);
  if (!existing) {
    throw new NotFoundError("Quotation not found");
  }

  if (existing.status === "ACCEPTED" || existing.status === "DECLINED") {
    throw new ConflictError(`Cannot edit quotation that has already been ${existing.status.toLowerCase()}`);
  }

  let itemsData = undefined;
  let totals = undefined;

  if (input.items && input.items.length > 0) {
    totals = calculateQuotationTotals(
      input.items,
      input.discount ?? Number(existing.discount),
      input.taxRate ?? Number(existing.taxRate),
    );
    itemsData = totals.items;
  } else if (input.discount !== undefined || input.taxRate !== undefined) {
    const currentItems = existing.items.map((it) => ({
      packageId: it.packageId,
      name: it.name,
      description: it.description,
      inclusions: it.inclusions,
      quantity: Number(it.quantity),
      unit: it.unit,
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount),
    }));
    totals = calculateQuotationTotals(
      currentItems,
      input.discount ?? Number(existing.discount),
      input.taxRate ?? Number(existing.taxRate),
    );
  }

  const rawUpdateData: Record<string, unknown> = {
    title: input.title !== undefined ? input.title.trim() : undefined,
    issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
    validUntil: input.validUntil !== undefined ? (input.validUntil ? new Date(input.validUntil) : null) : undefined,
    eventType: input.eventType !== undefined ? input.eventType : undefined,
    eventDate: input.eventDate !== undefined ? (input.eventDate ? new Date(input.eventDate) : null) : undefined,
    eventLocation: input.eventLocation !== undefined ? input.eventLocation?.trim() || null : undefined,
    guestCount: input.guestCount !== undefined ? input.guestCount : undefined,

    clientName: input.clientName !== undefined ? input.clientName.trim() : undefined,
    clientPhone: input.clientPhone !== undefined ? input.clientPhone?.trim() || null : undefined,
    clientEmail: input.clientEmail !== undefined ? input.clientEmail?.trim() || null : undefined,
    clientAddress: input.clientAddress !== undefined ? input.clientAddress?.trim() || null : undefined,

    vendorBusinessName: input.vendorBusinessName !== undefined ? input.vendorBusinessName.trim() : undefined,
    vendorCategory: input.vendorCategory !== undefined ? input.vendorCategory : undefined,
    vendorPhone: input.vendorPhone !== undefined ? input.vendorPhone : undefined,
    vendorEmail: input.vendorEmail !== undefined ? input.vendorEmail : undefined,
    vendorAddress: input.vendorAddress !== undefined ? input.vendorAddress : undefined,
    vendorLogoKey: input.vendorLogoKey !== undefined ? input.vendorLogoKey : undefined,
    vendorGstin: input.vendorGstin !== undefined ? input.vendorGstin : undefined,
    brandThemeColor: input.brandThemeColor !== undefined ? input.brandThemeColor : undefined,

    introduction: input.introduction !== undefined ? input.introduction : undefined,
    paymentTerms: input.paymentTerms !== undefined ? input.paymentTerms : undefined,
    terms: input.terms !== undefined ? input.terms : undefined,
    notes: input.notes !== undefined ? input.notes : undefined,
    currency: input.currency !== undefined ? input.currency : undefined,

    ...(totals
      ? {
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
          amountInWords: totals.amountInWords,
        }
      : {}),
  };

  const updateData = omitUndefined(rawUpdateData) as Prisma.VendorQuotationUpdateInput;

  return quotationRepository.updateQuotation(id, updateData, itemsData);
}

export async function deleteQuotation(vendorId: string, id: string) {
  const existing = await quotationRepository.findQuotationById(vendorId, id);
  if (!existing) {
    throw new NotFoundError("Quotation not found");
  }

  await quotationRepository.deleteQuotation(id);
  return { deleted: true };
}

export async function markAsSent(vendorId: string, id: string, sentVia: string) {
  await assertVendorFeatureAccess(vendorId, "invoicing_access", "Quotes & Invoices");
  const existing = await quotationRepository.findQuotationById(vendorId, id);
  if (!existing) {
    throw new NotFoundError("Quotation not found");
  }

  return quotationRepository.updateQuotation(id, {
    status: existing.status === "DRAFT" ? "SENT" : existing.status,
    sentAt: new Date(),
    sentVia,
  });
}

export async function duplicateQuotation(vendorId: string, id: string) {
  await assertVendorFeatureAccess(vendorId, "invoicing_access", "Quotes & Invoices");
  const source = await quotationRepository.findQuotationById(vendorId, id);
  if (!source) {
    throw new NotFoundError("Source quotation not found");
  }

  const quotationNumber = await generateNextQuotationNumber(vendorId);

  return quotationRepository.createQuotation({
    vendorId,
    leadId: source.leadId,
    quotationNumber,
    title: `${source.title} (Copy)`,
    issueDate: new Date(),
    validUntil: source.validUntil,
    eventType: source.eventType,
    eventDate: source.eventDate,
    eventLocation: source.eventLocation,
    guestCount: source.guestCount,
    clientName: source.clientName,
    clientPhone: source.clientPhone,
    clientEmail: source.clientEmail,
    clientAddress: source.clientAddress,
    vendorBusinessName: source.vendorBusinessName,
    vendorCategory: source.vendorCategory,
    vendorPhone: source.vendorPhone,
    vendorEmail: source.vendorEmail,
    vendorAddress: source.vendorAddress,
    vendorLogoKey: source.vendorLogoKey,
    vendorGstin: source.vendorGstin,
    brandThemeColor: source.brandThemeColor ?? "#E05A47",
    introduction: source.introduction,
    paymentTerms: source.paymentTerms,
    terms: source.terms,
    notes: source.notes,
    currency: source.currency,
    subtotal: source.subtotal,
    discount: source.discount,
    taxRate: source.taxRate,
    taxAmount: source.taxAmount,
    grandTotal: source.grandTotal,
    amountInWords: source.amountInWords,
    items: source.items.map((it) => ({
      packageId: it.packageId,
      itemOrder: it.itemOrder,
      name: it.name,
      description: it.description,
      inclusions: it.inclusions,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      discount: it.discount,
      total: it.total,
    })),
  });
}

export async function publicAcceptQuotation(viewToken: string, clientNote?: string) {
  const quote = await quotationRepository.findQuotationByToken(viewToken);
  if (!quote) {
    throw new NotFoundError("Quotation not found");
  }

  if (quote.status === "ACCEPTED") {
    return { success: true, alreadyAccepted: true, quotation: quote };
  }

  const updated = await quotationRepository.updateQuotation(quote.id, {
    status: "ACCEPTED",
    acceptedAt: new Date(),
    notes: clientNote
      ? `${quote.notes ? `${quote.notes}\n\n` : ""}Client Acceptance Note: ${clientNote}`
      : quote.notes,
  });

  if (quote.leadId) {
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: {
        status: "WON",
        statusHistory: {
          create: {
            fromStatus: "QUOTED",
            toStatus: "WON",
            reason: `Quotation #${quote.quotationNumber} accepted by couple${clientNote ? `: "${clientNote}"` : ""}`,
          },
        },
      },
    });
  }

  return { success: true, quotation: updated };
}

export async function publicDeclineQuotation(viewToken: string, reason?: string) {
  const quote = await quotationRepository.findQuotationByToken(viewToken);
  if (!quote) {
    throw new NotFoundError("Quotation not found");
  }

  const updated = await quotationRepository.updateQuotation(quote.id, {
    status: "DECLINED",
    declinedAt: new Date(),
    declineReason: reason?.trim() || null,
  });

  if (quote.leadId) {
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: {
        statusHistory: {
          create: {
            toStatus: "LOST",
            reason: `Quotation #${quote.quotationNumber} declined by couple${reason ? `: "${reason}"` : ""}`,
          },
        },
      },
    });
  }

  return { success: true, quotation: updated };
}

export async function convertToInvoice(vendorId: string, id: string) {
  await assertVendorFeatureAccess(vendorId, "invoicing_access", "Quotes & Invoices");
  const quote = await quotationRepository.findQuotationById(vendorId, id);
  if (!quote) {
    throw new NotFoundError("Quotation not found");
  }

  const invoiceItems = quote.items.map((item, idx) => ({
    description: item.name + (item.inclusions.length > 0 ? ` (${item.inclusions.join(", ")})` : ""),
    quantity: Number(item.quantity),
    unit: item.unit,
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
    gstRate: Number(quote.taxRate) || 0,
    sacCode: "998311",
    itemOrder: idx,
  }));

  return {
    quotationId: quote.id,
    leadId: quote.leadId,
    clientName: quote.clientName,
    clientPhone: quote.clientPhone,
    clientEmail: quote.clientEmail,
    clientAddress: quote.clientAddress,
    currency: quote.currency,
    items: invoiceItems,
  };
}

export async function convertToBooking(vendorId: string, id: string) {
  await assertVendorFeatureAccess(vendorId, "invoicing_access", "Quotes & Invoices");
  const quote = await quotationRepository.findQuotationById(vendorId, id);
  if (!quote) {
    throw new NotFoundError("Quotation not found");
  }

  const startDate = quote.eventDate || new Date();
  const endDate = quote.eventDate || new Date();

  const booking = await prisma.vendorBooking.create({
    data: {
      vendorId,
      quotationId: quote.id,
      leadId: quote.leadId,
      title: quote.title,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      eventType: quote.eventType || "Wedding",
      startDate,
      endDate,
      venueName: quote.eventLocation || "TBD",
      venueCity: quote.eventLocation || null,
      packageTitle: quote.items[0]?.name || "Quoted Package",
      totalAmount: quote.grandTotal,
      advancePaid: new Prisma.Decimal(0),
      status: "CONFIRMED",
      notes: `Created from Quotation #${quote.quotationNumber}`,
    },
  });

  await quotationRepository.updateQuotation(id, {
    convertedToBookingId: booking.id,
    status: quote.status === "DRAFT" || quote.status === "SENT" ? "ACCEPTED" : quote.status,
  });

  return booking;
}
