import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import type { ListInvoicesFilters, UpsertBillingProfileInput } from "./vendor-invoice.types";

export const INVOICE_FULL_INCLUDE = {
  items: { orderBy: { itemOrder: "asc" } },
  payments: { orderBy: { paymentDate: "desc" } },
  activities: { orderBy: { createdAt: "desc" } },
  lead: {
    select: {
      id: true,
      status: true,
      enquiry: {
        select: {
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          weddingDate: true,
          weddingLocation: true,
        },
      },
    },
  },
} satisfies Prisma.VendorInvoiceInclude;

export function findBillingProfile(vendorId: string) {
  return prisma.vendorBillingProfile.findUnique({
    where: { vendorId },
  });
}

export function upsertBillingProfile(vendorId: string, data: UpsertBillingProfileInput) {
  const updateData = omitUndefined({
    legalName: data.legalName,
    tradeName: data.tradeName,
    gstin: data.gstin,
    pan: data.pan,
    address: data.address,
    city: data.city,
    state: data.state,
    stateCode: data.stateCode,
    pincode: data.pincode,
    phone: data.phone,
    email: data.email,
    bankName: data.bankName,
    accountName: data.accountName,
    accountNumber: data.accountNumber,
    ifscCode: data.ifscCode,
    upiId: data.upiId,
    invoicePrefix: data.invoicePrefix,
    defaultNotes: data.defaultNotes,
    defaultTerms: data.defaultTerms,
  });

  return prisma.vendorBillingProfile.upsert({
    where: { vendorId },
    create: {
      vendorId,
      legalName: data.legalName ?? null,
      tradeName: data.tradeName ?? null,
      gstin: data.gstin ?? null,
      pan: data.pan ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      stateCode: data.stateCode ?? null,
      pincode: data.pincode ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      bankName: data.bankName ?? null,
      accountName: data.accountName ?? null,
      accountNumber: data.accountNumber ?? null,
      ifscCode: data.ifscCode ?? null,
      upiId: data.upiId ?? null,
      invoicePrefix: data.invoicePrefix ?? "INV",
      defaultNotes: data.defaultNotes ?? null,
      defaultTerms: data.defaultTerms ?? null,
    },
    update: updateData,
  });
}

export function findInvoiceById(vendorId: string, invoiceId: string) {
  return prisma.vendorInvoice.findFirst({
    where: { id: invoiceId, vendorId },
    include: INVOICE_FULL_INCLUDE,
  });
}

export async function findInvoices(vendorId: string, filters: ListInvoicesFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.VendorInvoiceWhereInput = {
    vendorId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.leadId ? { leadId: filters.leadId } : {}),
    ...(filters.search
      ? {
          OR: [
            { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
            { clientName: { contains: filters.search, mode: "insensitive" } },
            { clientPhone: { contains: filters.search, mode: "insensitive" } },
            { clientEmail: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.startDate || filters.endDate
      ? {
          issueDate: {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.vendorInvoice.findMany({
      where,
      include: {
        items: { select: { id: true, description: true, totalAmount: true } },
        payments: { select: { id: true, amount: true, paymentDate: true } },
      },
      orderBy: { issueDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.vendorInvoice.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getMetrics(vendorId: string) {
  const [aggregations, counts, overdueAgg] = await Promise.all([
    prisma.vendorInvoice.aggregate({
      where: { vendorId, status: { not: "CANCELLED" } },
      _sum: {
        grandTotal: true,
        paidAmount: true,
        balanceDue: true,
      },
    }),
    prisma.vendorInvoice.groupBy({
      by: ["status"],
      where: { vendorId },
      _count: true,
    }),
    prisma.vendorInvoice.aggregate({
      where: {
        vendorId,
        status: { not: "CANCELLED" },
        balanceDue: { gt: 0 },
        dueDate: { lt: new Date() },
      },
      _sum: {
        balanceDue: true,
      },
    }),
  ]);

  const countMap: Record<string, number> = {
    all: 0,
    DRAFT: 0,
    ISSUED: 0,
    PAID: 0,
    CANCELLED: 0,
  };

  let allCount = 0;
  for (const c of counts) {
    countMap[c.status] = c._count;
    allCount += c._count;
  }
  countMap["all"] = allCount;

  return {
    totalInvoiced: Number(aggregations._sum.grandTotal ?? 0),
    totalReceived: Number(aggregations._sum.paidAmount ?? 0),
    outstandingBalance: Number(aggregations._sum.balanceDue ?? 0),
    overdueAmount: Number(overdueAgg._sum.balanceDue ?? 0),
    counts: {
      all: countMap["all"] ?? 0,
      draft: countMap["DRAFT"] ?? 0,
      issued: countMap["ISSUED"] ?? 0,
      paid: countMap["PAID"] ?? 0,
      cancelled: countMap["CANCELLED"] ?? 0,
    },
  };
}

export function findLeadForPrefill(vendorId: string, leadId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, vendorId },
    include: {
      enquiry: true,
    },
  });
}
