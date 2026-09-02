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

export interface TelegramMessage {
  message_id: number;
  from?: TelegramApiUser;
  chat: TelegramChat;
  text?: string;
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
