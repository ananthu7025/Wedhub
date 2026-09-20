import { Prisma, type VendorQuotationStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import type { ListQuotationsFilters, QuotationSummaryMetrics } from "./vendor-quotation.types";

export async function findQuotations(vendorId: string, filters: ListQuotationsFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.VendorQuotationWhereInput = {
    vendorId,
  };

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.leadId) {
    where.leadId = filters.leadId;
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    where.OR = [
      { quotationNumber: { contains: s, mode: "insensitive" } },
      { clientName: { contains: s, mode: "insensitive" } },
      { title: { contains: s, mode: "insensitive" } },
      { clientPhone: { contains: s, mode: "insensitive" } },
      { clientEmail: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.vendorQuotation.count({ where }),
    prisma.vendorQuotation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { itemOrder: "asc" },
        },
        lead: {
          select: {
            id: true,
            status: true,
            enquiry: {
              select: {
                weddingDate: true,
                weddingLocation: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    items,
  };
}

const quotationVendorSelect = {
  id: true,
  businessName: true,
  slug: true,
  profile: {
    select: {
      logoMedia: true,
      coverMedia: true,
      website: true,
    },
  },
};

export async function findQuotationById(vendorId: string, id: string) {
  return prisma.vendorQuotation.findFirst({
    where: { id, vendorId },
    include: {
      items: {
        orderBy: { itemOrder: "asc" },
      },
      lead: {
        include: {
          enquiry: true,
        },
      },
      vendor: {
        select: quotationVendorSelect,
      },
    },
  });
}

export async function findQuotationByToken(viewToken: string) {
  return prisma.vendorQuotation.findUnique({
    where: { viewToken },
    include: {
      items: {
        orderBy: { itemOrder: "asc" },
      },
      vendor: {
        select: quotationVendorSelect,
      },
    },
  });
}

export async function findLatestQuotationNumber(vendorId: string, year: number): Promise<string | null> {
  const prefix = `QT-${year}-`;
  const latest = await prisma.vendorQuotation.findFirst({
    where: {
      vendorId,
      quotationNumber: { startsWith: prefix },
    },
    orderBy: { quotationNumber: "desc" },
    select: { quotationNumber: true },
  });
  return latest?.quotationNumber || null;
}

export async function createQuotation(data: {
  vendorId: string;
  leadId?: string | null;
  quotationNumber: string;
  status?: VendorQuotationStatus;
  title: string;
  issueDate: Date;
  validUntil?: Date | null;
  eventType: string;
  eventDate?: Date | null;
  eventLocation?: string | null;
  guestCount?: number | null;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  vendorBusinessName: string;
  vendorCategory?: string | null;
  vendorPhone?: string | null;
  vendorEmail?: string | null;
  vendorAddress?: string | null;
  vendorLogoKey?: string | null;
  vendorGstin?: string | null;
  brandThemeColor?: string;
  introduction?: string | null;
  paymentTerms?: string | null;
  terms?: string | null;
  notes?: string | null;
  currency: string;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  amountInWords?: string | null;
  items: Array<{
    packageId?: string | null;
    itemOrder: number;
    name: string;
    description?: string | null;
    inclusions: string[];
    quantity: Prisma.Decimal;
    unit: string;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
  }>;
}) {
  const { items, ...quotationData } = data;

  return prisma.vendorQuotation.create({
    data: {
      ...quotationData,
      items: {
        create: items,
      },
    },
    include: {
      items: {
        orderBy: { itemOrder: "asc" },
      },
      lead: true,
      vendor: {
        select: quotationVendorSelect,
      },
    },
  });
}

export async function updateQuotation(
  id: string,
  data: Partial<Prisma.VendorQuotationUpdateInput>,
  newItems?: Array<{
    packageId?: string | null;
    itemOrder: number;
    name: string;
    description?: string | null;
    inclusions: string[];
    quantity: Prisma.Decimal;
    unit: string;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
  }>,
) {
  return prisma.$transaction(async (tx) => {
    if (newItems) {
      await tx.vendorQuotationItem.deleteMany({
        where: { quotationId: id },
      });
      await tx.vendorQuotationItem.createMany({
        data: newItems.map((item) => ({
          ...item,
          quotationId: id,
        })),
      });
    }

    return tx.vendorQuotation.update({
      where: { id },
      data,
      include: {
        items: {
          orderBy: { itemOrder: "asc" },
        },
        lead: true,
        vendor: {
          select: quotationVendorSelect,
        },
      },
    });
  });
}

export async function deleteQuotation(id: string) {
  return prisma.vendorQuotation.delete({
    where: { id },
  });
}

export async function getQuotationMetrics(vendorId: string): Promise<QuotationSummaryMetrics> {
  const quotes = await prisma.vendorQuotation.findMany({
    where: { vendorId },
    select: {
      status: true,
      grandTotal: true,
    },
  });

  let totalCount = 0;
  let draftCount = 0;
  let sentCount = 0;
  let acceptedCount = 0;
  let declinedCount = 0;
  let expiredCount = 0;
  let totalQuotedValue = 0;
  let totalAcceptedValue = 0;

  for (const q of quotes) {
    totalCount++;
    const val = Number(q.grandTotal);
    totalQuotedValue += val;

    switch (q.status) {
      case "DRAFT":
        draftCount++;
        break;
      case "SENT":
        sentCount++;
        break;
      case "ACCEPTED":
        acceptedCount++;
        totalAcceptedValue += val;
        break;
      case "DECLINED":
        declinedCount++;
        break;
      case "EXPIRED":
        expiredCount++;
        break;
    }
  }

  const finishedCount = sentCount + acceptedCount + declinedCount;
  const conversionRate = finishedCount > 0 ? Number(((acceptedCount / finishedCount) * 100).toFixed(1)) : 0;

  return {
    totalCount,
    draftCount,
    sentCount,
    acceptedCount,
    declinedCount,
    expiredCount,
    totalQuotedValue: Math.round(totalQuotedValue),
    totalAcceptedValue: Math.round(totalAcceptedValue),
    conversionRate,
  };
}
