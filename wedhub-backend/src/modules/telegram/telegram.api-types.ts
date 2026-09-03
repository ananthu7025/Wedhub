// Minimal local shapes for exactly the Telegram Bot API fields this module
// reads. `node-telegram-bot-api`'s own types are declared via `export =`
// (a CJS class+namespace merge) — referencing its nested TelegramBot.Message
// etc. from a type-only import trips this project's `noUnusedLocals`/
// `no-require-imports` lint rules simultaneously with no clean escape, so
// these are defined locally instead rather than fighting the library's
// type-export style.
export interface TelegramApiUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
}

// One entry per resolution Telegram generated for an uploaded photo,
// smallest first, largest (highest-quality) last — Telegram's own
// documented ordering. Arch Phase 26's WW_COLLECTING_PHOTOS state always
// takes the last element for the highest available quality.
export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramApiUser;
  chat: TelegramChat;
  text?: string;
  photo?: TelegramPhotoSize[];
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramApiUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}
