import { config } from "dotenv";
config({ path: ".env.local" });

import { initBot } from "./lib/telegram-bot";

const bot = initBot();

if (bot) {
  bot.launch().then(() => {
    console.log("[TelegramBot] 🤖 Bot started successfully");
    console.log("[TelegramBot] Listening for commands...");
  }).catch((err) => {
    console.error("[TelegramBot] Failed to start:", err);
    process.exit(1);
  });

  // Graceful shutdown
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
} else {
  console.error("[TelegramBot] Failed to initialize bot - check TELEGRAM_BOT_TOKEN");
  process.exit(1);
}
