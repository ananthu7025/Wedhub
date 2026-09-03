import type { TelegramConversation } from "@prisma/client";
import { env } from "../../config/env";
import * as categoriesRepository from "../categories/categories.repository";
import * as locationsRepository from "../locations/locations.repository";
import * as searchRepository from "../search/search.repository";
import { rankVendors } from "../search/vendor-ranking.service";
import * as enquiryService from "../enquiries/enquiry.service";
import * as weddingWebsiteService from "../wedding-website/wedding-website.service";
import * as weddingWebsiteMediaService from "../wedding-website-media/wedding-website-media.service";
import { downloadTelegramFile } from "../../integrations/telegram/telegram.client";
import type { InlineButton } from "../../integrations/telegram/messaging-provider";
import { NotFoundError } from "../../common/errors";
import * as telegramRepository from "./telegram.repository";
import type { EnquiryCollectedData, WeddingWebsiteCollectedData, WeddingWebsiteTemplateChoice } from "./telegram.conversation.types";
import type { TelegramPhotoSize } from "./telegram.api-types";

const CANDIDATE_SHORTLIST_SIZE = 3;
const MAX_TELEGRAM_PHOTO_SIZE_BYTES = 20 * 1024 * 1024; // Telegram's own inbound-file cap

interface StepResult {
  text: string;
  buttons?: InlineButton[][];
}

function skipRow(): InlineButton[][] {
  return [[{ text: "Skip", callbackData: "skip" }]];
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
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

// product.md §34's welcome screen — "1. Find a vendor" was the only
// branch the original MVP implemented (the other four — venues,
// recommendations without a specific service, resuming/saved requests —
// aren't in architecture.md's Phase 15 task list). Arch Phase 26 adds a
// second, real branch: "Create Your Wedding Website – ₹49".
export async function startConversation(telegramUserRowId: string): Promise<StepResult> {
  await telegramRepository.resetOrCreateConversation(telegramUserRowId);
  return {
    text: "Welcome to itsmyKalyanam! What are you planning?",
    buttons: [
      [{ text: "Find a vendor", callbackData: "start:find_vendor" }],
      [{ text: "💍 Create Your Wedding Website – ₹49", callbackData: "start:create_website" }],
    ],
  };
}

// ============================================================
// ENQUIRY flow — unchanged from before Arch Phase 26, just moved into
// its own properly-typed function so advanceConversation can dispatch
// on flowType without every case needing a runtime type guard.
// ============================================================

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

async function promptVendorMatches(data: EnquiryCollectedData): Promise<StepResult> {
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

function promptConfirmation(data: EnquiryCollectedData): StepResult {
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

async function advanceEnquiryConversation(
  conversation: TelegramConversation,
  telegramUserRowId: string,
  input: { text: string | undefined; callbackData: string | undefined },
  contextForConfirmation: { userId: string | undefined; contactName: string; telegramUserId: bigint },
): Promise<StepResult> {
  const data = (conversation.collectedData as EnquiryCollectedData | null) ?? {};

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

// ============================================================
// WEDDING_WEBSITE flow — Arch Phase 26. Unlike ENQUIRY's "nothing
// durable until the end" pattern, the real WeddingWebsite row is
// created early (WW_SELECTING_TEMPLATE -> WW_COLLECTING_COUPLE_NAMES),
// per docs/12-stage-wedding-website.md's "Telegram flow design"
// decision — photo uploads need a real weddingWebsiteId to attach to.
// Every state after that writes straight to the real WeddingWebsite/
// WeddingWebsiteEvent rows via wedding-website.service.ts's
// TELEGRAM_USER owner-ref functions; collectedData only holds the
// template choice (before the draft exists) and an in-progress event
// being built across a few short prompts.
// ============================================================

const TEMPLATE_CHOICES: Array<{ id: WeddingWebsiteTemplateChoice; label: string }> = [
  { id: "ROYAL_WEDDING", label: "Royal Wedding" },
  { id: "MINIMAL_ELEGANT", label: "Minimal Elegant" },
  { id: "TRADITIONAL_INDIAN", label: "Traditional Indian Wedding" },
];

function promptTemplate(): StepResult {
  return {
    text: "Let's create your wedding website for just ₹49 💍\n\nChoose a template:",
    buttons: TEMPLATE_CHOICES.map((t): InlineButton[] => [{ text: t.label, callbackData: `ww_template:${t.id}` }]),
  };
}

function promptBrideName(): StepResult {
  return { text: "What's the bride's name?" };
}

function promptGroomName(): StepResult {
  return { text: "And the groom's name?" };
}

function promptWeddingDateWW(): StepResult {
  return { text: "When's the big day? (e.g. 2027-06-20, or Skip)", buttons: skipRow() };
}

function promptVenue(): StepResult {
  return { text: "Where's the venue? (or Skip)", buttons: skipRow() };
}

function promptAddEvent(): StepResult {
  return {
    text: "Want to add a wedding event (like Mehendi, Haldi, or Reception)?",
    buttons: [
      [
        { text: "+ Add an event", callbackData: "ww_event:add" },
        { text: "Done with events", callbackData: "ww_event:done" },
      ],
    ],
  };
}

function promptEventName(): StepResult {
  return { text: "What's the event called? (e.g. Mehendi)" };
}

function promptEventVenue(): StepResult {
  return { text: "Where's that event? (or Skip)", buttons: skipRow() };
}

function promptPhotos(): StepResult {
  return {
    text: "Send a few photos for your wedding website (cover photo, couple photo, gallery) — or tap Done when you're finished.",
    buttons: [[{ text: "Done with photos", callbackData: "ww_photos:done" }]],
  };
}

function promptPreviewReady(): StepResult {
  return {
    text: "Your wedding website is ready ❤️",
    buttons: [[{ text: "Preview Website", callbackData: "ww_preview:generate" }]],
  };
}

function promptPublishCta(previewUrl: string | undefined): StepResult {
  return {
    text: "Love it? Publish your wedding website for just ₹49 to get your permanent shareable link.",
    buttons: [
      ...(previewUrl ? [[{ text: "View Preview", url: previewUrl }] as InlineButton[]] : []),
      [{ text: "Publish My Website – ₹49", callbackData: "ww_publish:start" }],
    ],
  };
}

async function advanceWeddingWebsiteConversation(
  conversation: TelegramConversation,
  telegramUserRowId: string,
  input: { text: string | undefined; callbackData: string | undefined; photo: TelegramPhotoSize[] | undefined },
  contextForConfirmation: { contactName: string; contactPhone: string | undefined },
): Promise<StepResult> {
  const data = (conversation.collectedData as WeddingWebsiteCollectedData | null) ?? {};
  const owner = { kind: "TELEGRAM_USER" as const, id: telegramUserRowId };

  switch (conversation.state) {
    case "WW_SELECTING_TEMPLATE": {
      const template = input.callbackData?.startsWith("ww_template:")
        ? (input.callbackData.slice(12) as WeddingWebsiteTemplateChoice)
        : undefined;
      if (!template || !TEMPLATE_CHOICES.some((t) => t.id === template)) {
        return promptTemplate();
      }
      await telegramRepository.updateConversation(conversation.id, {
        state: "WW_COLLECTING_COUPLE_NAMES",
        collectedData: { ...data, template },
      });
      return promptBrideName();
    }

    case "WW_COLLECTING_COUPLE_NAMES": {
      // Two-part prompt (bride then groom), tracked by whether
      // brideNameDraft has been recorded yet. The groom-name half (and
      // real draft creation) is handled one level up in
      // advanceConversation, since it needs createDraftForTelegramUser
      // rather than an owner-scoped mutation — every other WW_* case
      // here operates on an already-existing draft via getOwnedDraftOrThrow.
      if (!data.brideNameDraft) {
        if (!input.text?.trim()) return promptBrideName();
        await telegramRepository.updateConversation(conversation.id, {
          collectedData: { ...data, brideNameDraft: input.text.trim() },
        });
        return promptGroomName();
      }
      return promptGroomName();
    }

    case "WW_COLLECTING_WEDDING_DATE": {
      if (input.callbackData !== "skip" && input.text) {
        const parsed = parseDate(input.text);
        if (!parsed) {
          return { text: "I couldn't read that date. Try a format like 2027-06-20, or tap Skip.", buttons: skipRow() };
        }
        await weddingWebsiteService.updateDraft(conversation.weddingWebsiteId as string, owner, { weddingDate: parsed });
      }
      await telegramRepository.updateConversation(conversation.id, { state: "WW_COLLECTING_VENUE" });
      return promptVenue();
    }

    case "WW_COLLECTING_VENUE": {
      if (input.callbackData !== "skip" && input.text) {
        await weddingWebsiteService.updateDraft(conversation.weddingWebsiteId as string, owner, { venueName: input.text.trim() });
      }
      await telegramRepository.updateConversation(conversation.id, { state: "WW_COLLECTING_EVENTS" });
      return promptAddEvent();
    }

    case "WW_COLLECTING_EVENTS": {
      if (input.callbackData === "ww_event:done") {
        await telegramRepository.updateConversation(conversation.id, { state: "WW_COLLECTING_PHOTOS" });
        return promptPhotos();
      }
      if (input.callbackData === "ww_event:add") {
        return promptEventName();
      }
      // Check the pending-venue reply BEFORE the "bare text = new event
      // name" fallback below — otherwise a venue reply like "Taj Hotel"
      // would be misread as the name of a second event, since both
      // arrive as plain text at this same state.
      if (data.pendingEventName) {
        const venue = input.callbackData === "skip" ? undefined : input.text?.trim();
        await weddingWebsiteService.createEvent(conversation.weddingWebsiteId as string, owner, {
          name: data.pendingEventName,
          venue,
        });
        await telegramRepository.updateConversation(conversation.id, { collectedData: { ...data, pendingEventName: undefined } });
        return promptAddEvent();
      }
      // A bare text reply while at this junction (not "add"/"done" yet) is
      // treated as the event name directly, so a user who just starts
      // typing an event name isn't forced to tap "+ Add an event" first.
      if (input.text?.trim()) {
        await telegramRepository.updateConversation(conversation.id, {
          collectedData: { ...data, pendingEventName: input.text.trim() },
        });
        return promptEventVenue();
      }
      return promptAddEvent();
    }

    case "WW_COLLECTING_PHOTOS": {
      if (input.callbackData === "ww_photos:done") {
        await telegramRepository.updateConversation(conversation.id, { state: "WW_PREVIEW_READY" });
        return promptPreviewReady();
      }
      if (input.photo && input.photo.length > 0) {
        // Largest = last, per Telegram's own documented ordering.
        const best = input.photo[input.photo.length - 1] as TelegramPhotoSize;
        if ((best.file_size ?? 0) > MAX_TELEGRAM_PHOTO_SIZE_BYTES) {
          return { text: "That photo is too large — please try a smaller one, or tap Done.", buttons: [[{ text: "Done with photos", callbackData: "ww_photos:done" }]] };
        }
        const { bytes, mimeType } = await downloadTelegramFile(best.file_id);
        const media = await weddingWebsiteMediaService.ingestTelegramPhoto(telegramUserRowId, {
          weddingWebsiteId: conversation.weddingWebsiteId as string,
          fileBytes: bytes,
          fileSize: bytes.length,
          mimeType,
          fileExtension: ".jpg",
        });
        // First photo becomes the cover automatically — subsequent ones
        // just join the gallery (same "first upload = cover" convenience
        // the web wizard doesn't have, since Telegram has no dedicated
        // "cover photo" upload slot the way the web Photos step does).
        const draft = await weddingWebsiteService.getOwnDraft(conversation.weddingWebsiteId as string, owner);
        if (!draft.coverMedia) {
          await weddingWebsiteService.updateDraft(conversation.weddingWebsiteId as string, owner, { coverMediaId: media.id });
        }
        return { text: "Got it! Send another photo, or tap Done.", buttons: [[{ text: "Done with photos", callbackData: "ww_photos:done" }]] };
      }
      return promptPhotos();
    }

    case "WW_PREVIEW_READY": {
      if (input.callbackData === "ww_preview:generate") {
        const result = await weddingWebsiteService.generatePreview(conversation.weddingWebsiteId as string, owner);
        await telegramRepository.updateConversation(conversation.id, { state: "WW_AWAITING_PAYMENT" });
        return promptPublishCta(`${env.FRONTEND_URL}/preview/${result.previewToken}`);
      }
      return promptPreviewReady();
    }

    case "WW_AWAITING_PAYMENT": {
      if (input.callbackData === "ww_publish:start") {
        const result = await weddingWebsiteService.createPublishPaymentLink(conversation.weddingWebsiteId as string, telegramUserRowId, {
          contactName: contextForConfirmation.contactName,
          contactPhone: contextForConfirmation.contactPhone,
        });
        return {
          text: `Tap below to pay ₹${result.amount} securely and publish your wedding website:`,
          buttons: [[{ text: `Pay ₹${result.amount} to Publish`, url: result.shortUrl }]],
        };
      }
      return promptPublishCta(undefined);
    }

    case "WW_PUBLISHED":
    default:
      return startConversation(telegramUserRowId);
  }
}

// One entry point for both free-text messages and button taps — a button
// tap arrives as a callback_data string (e.g. "category:<uuid>"), a typed
// reply arrives as plain text; the state itself decides which it expects.
// Arch Phase 26: dispatches on conversation.flowType before doing
// anything else, so ENQUIRY and WEDDING_WEBSITE never share a data cast.
export async function advanceConversation(
  conversation: TelegramConversation,
  telegramUserRowId: string,
  input: { text: string | undefined; callbackData: string | undefined; photo?: TelegramPhotoSize[] | undefined },
  contextForConfirmation: { userId: string | undefined; contactName: string; contactPhone: string | undefined; telegramUserId: bigint },
): Promise<StepResult> {
  if (conversation.state === "START") {
    if (input.callbackData === "start:create_website") {
      await telegramRepository.updateConversation(conversation.id, {
        flowType: "WEDDING_WEBSITE",
        state: "WW_SELECTING_TEMPLATE",
      });
      return promptTemplate();
    }
    if (input.callbackData !== "start:find_vendor") {
      return startConversation(telegramUserRowId);
    }
  }

  if (conversation.flowType === "WEDDING_WEBSITE") {
    // WW_COLLECTING_COUPLE_NAMES's second half (groom name) both creates
    // the real draft AND advances the state — handled here, one level up
    // from the switch, since it needs createDraftForTelegramUser
    // (owner-creation, not an owner-scoped mutation, so it doesn't fit
    // getOwnedDraftOrThrow's shape the way every other WW_* transition
    // does). Only fires once brideNameDraft is already recorded — the
    // first half (collecting the bride's name) is handled inside the
    // switch in advanceWeddingWebsiteConversation below.
    if (conversation.state === "WW_COLLECTING_COUPLE_NAMES" && input.text?.trim()) {
      const data = (conversation.collectedData as WeddingWebsiteCollectedData | null) ?? {};
      if (data.brideNameDraft) {
        const draft = await weddingWebsiteService.createDraftForTelegramUser(telegramUserRowId, {
          template: data.template ?? "ROYAL_WEDDING",
          brideName: data.brideNameDraft,
          groomName: input.text.trim(),
        });
        await telegramRepository.updateConversation(conversation.id, {
          state: "WW_COLLECTING_WEDDING_DATE",
          weddingWebsiteId: draft.id,
          collectedData: { template: data.template },
        });
        return promptWeddingDateWW();
      }
    }

    try {
      return await advanceWeddingWebsiteConversation(
        conversation,
        telegramUserRowId,
        { text: input.text, callbackData: input.callbackData, photo: input.photo },
        { contactName: contextForConfirmation.contactName, contactPhone: contextForConfirmation.contactPhone },
      );
    } catch (err) {
      if (err instanceof NotFoundError) {
        // The draft was deleted or somehow became unreachable mid-flow —
        // fail safe back to the main menu rather than a dead conversation.
        return startConversation(telegramUserRowId);
      }
      throw err;
    }
  }

  return advanceEnquiryConversation(conversation, telegramUserRowId, input, {
    userId: contextForConfirmation.userId,
    contactName: contextForConfirmation.contactName,
    telegramUserId: contextForConfirmation.telegramUserId,
  });
}
