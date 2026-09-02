import type { TelegramConversation } from "@prisma/client";
import * as categoriesRepository from "../categories/categories.repository";
import * as locationsRepository from "../locations/locations.repository";
import * as searchRepository from "../search/search.repository";
import { rankVendors } from "../search/vendor-ranking.service";
import * as enquiryService from "../enquiries/enquiry.service";
import type { InlineButton } from "../../integrations/telegram/messaging-provider";
import * as telegramRepository from "./telegram.repository";
import type { CollectedData } from "./telegram.conversation.types";

const CANDIDATE_SHORTLIST_SIZE = 3;

interface StepResult {
  text: string;
  buttons?: InlineButton[][];
}

function skipRow(): InlineButton[][] {
  return [[{ text: "Skip", callbackData: "skip" }]];
}

function parseDate(input: string): Date | undefined {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function parseBudget(input: string): number | undefined {
  const digits = input.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseGuestCount(input: string): number | undefined {
  const digits = input.replace(/[^0-9]/g, "");
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

// product.md §34's welcome screen — "1. Find a vendor" is the only branch
// this MVP implements (the other four — venues, recommendations without a
// specific service, resuming/saved requests — aren't in architecture.md's
// Phase 15 task list and would need their own design; declared as a visible
// gap rather than silently only supporting one path with no acknowledgment).
export async function startConversation(telegramUserRowId: string): Promise<StepResult> {
  await telegramRepository.resetOrCreateConversation(telegramUserRowId);
  return {
    text: "Welcome to WedHub! What are you planning?",
    buttons: [[{ text: "Find a vendor", callbackData: "start:find_vendor" }]],
  };
}

async function promptCategory(): Promise<StepResult> {
  const categories = await categoriesRepository.findActiveCategories();
  return {
    text: "What service do you need?",
    buttons: chunk(
      categories.map((c) => ({ text: c.name, callbackData: `category:${c.id}` })),
      2,
    ),
  };
}

async function promptCity(): Promise<StepResult> {
  const cities = await locationsRepository.findLocations({ type: "CITY", parentId: undefined });
  return {
    text: "Where is your wedding?",
    buttons: chunk(
      cities.map((c) => ({ text: c.name, callbackData: `city:${c.id}` })),
      2,
    ),
  };
}

function promptDate(): StepResult {
  return { text: "When is your wedding? (e.g. 2027-06-20, or Skip)", buttons: skipRow() };
}

function promptBudget(): StepResult {
  return { text: "What's your approximate budget? (e.g. 4000, or Skip)", buttons: skipRow() };
}

function promptGuestCount(): StepResult {
  return { text: "Roughly how many guests? (or Skip)", buttons: skipRow() };
}

function promptContact(): StepResult {
  return { text: "What's the best phone number to reach you? (or Skip)", buttons: skipRow() };
}

async function promptVendorMatches(data: CollectedData): Promise<StepResult> {
  if (!data.categoryId || !data.cityId) {
    return { text: "Something went wrong matching vendors — let's start over. Send /start to try again." };
  }
  // Reuses Arch Phase 7's ranking service, not a separate matching
  // implementation — confirmed with the user (Risk 3), same reuse
  // enquiry.service.ts's multi-vendor flow already relies on.
  const { rows } = await searchRepository.searchVendors(
    {
      keyword: undefined,
      categoryId: data.categoryId,
      cityId: data.cityId,
      serviceAreaId: undefined,
      priceMin: undefined,
      priceMax: undefined,
      verified: undefined,
      attributes: undefined,
      page: 1,
      limit: 20,
    },
    "recommended",
  );

  if (rows.length === 0) {
    return {
      text: `Sorry, no ${data.categoryName ?? "matching"} vendors found in ${data.cityName ?? "that city"} yet. Send /start to try a different search.`,
    };
  }

  const shortlist = rankVendors(rows).slice(0, CANDIDATE_SHORTLIST_SIZE);
  return {
    text: "Here are some vendors that match what you're looking for:",
    buttons: [
      ...shortlist.map((v): InlineButton[] => [{ text: v.businessName, callbackData: `vendor:${v.id}` }]),
    ],
  };
}

function promptConfirmation(data: CollectedData): StepResult {
  const lines = [
    `Category: ${data.categoryName ?? "-"}`,
    `City: ${data.cityName ?? "-"}`,
    data.weddingDate ? `Date: ${data.weddingDate}` : undefined,
    data.budget ? `Budget: ${data.budget}` : undefined,
    data.guestCount ? `Guests: ${data.guestCount}` : undefined,
  ].filter((line): line is string => !!line);

  return {
    text: `Ready to send this enquiry?\n\n${lines.join("\n")}\n\nWould you like to send an enquiry?`,
    buttons: [
      [
        { text: "Yes, send it", callbackData: "confirm:yes" },
        { text: "Cancel", callbackData: "confirm:no" },
      ],
    ],
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

// One entry point for both free-text messages and button taps — a button
// tap arrives as a callback_data string (e.g. "category:<uuid>"), a typed
// reply arrives as plain text; the state itself decides which it expects.
export async function advanceConversation(
  conversation: TelegramConversation,
  telegramUserRowId: string,
  input: { text: string | undefined; callbackData: string | undefined },
  contextForConfirmation: { userId: string | undefined; contactName: string; telegramUserId: bigint },
): Promise<StepResult> {
  const data = (conversation.collectedData as CollectedData | null) ?? {};

  switch (conversation.state) {
    case "START": {
      if (input.callbackData === "start:find_vendor") {
        await telegramRepository.updateConversation(conversation.id, { state: "SELECTING_CATEGORY" });
        return promptCategory();
      }
      return startConversation(telegramUserRowId);
    }

    case "SELECTING_CATEGORY": {
      const categoryId = input.callbackData?.startsWith("category:") ? input.callbackData.slice(9) : undefined;
      if (!categoryId) return promptCategory();
      const category = await categoriesRepository.findCategoryById(categoryId);
      if (!category) return promptCategory();
      await telegramRepository.updateConversation(conversation.id, {
        state: "SELECTING_LOCATION",
        collectedData: { ...data, categoryId: category.id, categoryName: category.name },
      });
      return promptCity();
    }

    case "SELECTING_LOCATION": {
      const cityId = input.callbackData?.startsWith("city:") ? input.callbackData.slice(5) : undefined;
      if (!cityId) return promptCity();
      const city = await locationsRepository.findLocationById(cityId);
      if (!city) return promptCity();
      await telegramRepository.updateConversation(conversation.id, {
        state: "COLLECTING_DATE",
        collectedData: { ...data, cityId: city.id, cityName: city.name },
      });
      return promptDate();
    }

    case "COLLECTING_DATE": {
      const next = { ...data };
      if (input.callbackData !== "skip" && input.text) {
        const parsed = parseDate(input.text);
        if (!parsed) {
          return { text: "I couldn't read that date. Try a format like 2027-06-20, or tap Skip.", buttons: skipRow() };
        }
        next.weddingDate = parsed.toISOString();
      }
      await telegramRepository.updateConversation(conversation.id, { state: "COLLECTING_BUDGET", collectedData: next });
      return promptBudget();
    }

    case "COLLECTING_BUDGET": {
      const next = { ...data };
      if (input.callbackData !== "skip" && input.text) {
        const parsed = parseBudget(input.text);
        if (!parsed) {
          return { text: "Please enter a number, e.g. 4000 or $4,000 — or tap Skip.", buttons: skipRow() };
        }
        next.budget = parsed;
      }
      await telegramRepository.updateConversation(conversation.id, { state: "COLLECTING_GUEST_COUNT", collectedData: next });
      return promptGuestCount();
    }

    case "COLLECTING_GUEST_COUNT": {
      const next = { ...data };
      if (input.callbackData !== "skip" && input.text) {
        const parsed = parseGuestCount(input.text);
        if (!parsed) {
          return { text: "Please enter a number, e.g. 100 — or tap Skip.", buttons: skipRow() };
        }
        next.guestCount = parsed;
      }
      await telegramRepository.updateConversation(conversation.id, { state: "COLLECTING_CONTACT", collectedData: next });
      return promptContact();
    }

    case "COLLECTING_CONTACT": {
      const next = { ...data };
      if (input.callbackData !== "skip" && input.text) {
        next.contactPhone = input.text.trim();
      }
      await telegramRepository.updateConversation(conversation.id, { state: "MATCHING_VENDORS", collectedData: next });
      const matches = await promptVendorMatches(next);
      await telegramRepository.updateConversation(conversation.id, { state: "SELECTING_VENDOR" });
      return matches;
    }

    case "SELECTING_VENDOR": {
      const vendorId = input.callbackData?.startsWith("vendor:") ? input.callbackData.slice(7) : undefined;
      if (!vendorId) return promptVendorMatches(data);
      const next = { ...data, selectedVendorId: vendorId };
      await telegramRepository.updateConversation(conversation.id, { state: "CONFIRMING_ENQUIRY", collectedData: next });
      return promptConfirmation(next);
    }

    case "CONFIRMING_ENQUIRY": {
      if (input.callbackData === "confirm:no") {
        await telegramRepository.updateConversation(conversation.id, { state: "COMPLETED" });
        return { text: "No problem — send /start any time to search again." };
      }
      if (input.callbackData !== "confirm:yes" || !data.selectedVendorId) {
        return promptConfirmation(data);
      }

      // product.md §45's synthesized placeholder for a Telegram-sourced
      // contact with no real email on file (confirmed with the user) — the
      // real contact channel for this lead is Telegram/phone, not this
      // address; every downstream consumer (vendor dashboard, notification
      // templates) already treats contactEmail as opaque.
      const { enquiry } = await enquiryService.createSingleVendorEnquiry(contextForConfirmation.userId, {
        vendorId: data.selectedVendorId,
        source: "TELEGRAM",
        categoryId: data.categoryId,
        cityId: data.cityId,
        contactName: contextForConfirmation.contactName,
        contactEmail: `telegram_${contextForConfirmation.telegramUserId}@wedhub.telegram`,
        contactPhone: data.contactPhone,
        preferredContactMethod: undefined,
        weddingDate: data.weddingDate ? new Date(data.weddingDate) : undefined,
        weddingLocation: data.cityName,
        serviceId: undefined,
        budget: data.budget,
        guestCount: data.guestCount,
        message: undefined,
      });

      await telegramRepository.updateConversation(conversation.id, {
        state: "COMPLETED",
        enquiryId: enquiry.id,
      });
      return {
        text: "Your enquiry has been sent! The vendor will be notified and should reach out soon. Send /start to search again.",
      };
    }

    case "MATCHING_VENDORS":
    case "COMPLETED":
    default:
      return startConversation(telegramUserRowId);
  }
}
