import { Telegraf } from "telegraf";

// In-memory stores (replace with database in production)
interface TrustedUser {
  id: number;
  username?: string;
  firstName?: string;
  level: "verified" | "trusted" | "admin";
  approvedBy: number;
  approvedAt: Date;
}

interface PendingRequest {
  id: number;
  username?: string;
  firstName?: string;
  requestedAt: Date;
  reason?: string;
}

const trustedUsers: Map<number, TrustedUser> = new Map();
const pendingRequests: Map<number, PendingRequest> = new Map();

let bot: Telegraf | null = null;
let config: {
  BOT_TOKEN: string;
  ADMIN_IDS: number[];
  CHANNEL_ID: string | undefined;
  APP_URL: string;
};

export function initBot() {
  // Get config at init time (after dotenv has loaded)
  config = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
    ADMIN_IDS: process.env.TELEGRAM_ADMIN_IDS?.split(",").map(Number) || [],
    CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    APP_URL: process.env.APP_URL || "http://77.42.24.244:3001",
  };

  console.log("[TelegramBot] Config loaded:", {
    hasToken: !!config.BOT_TOKEN,
    adminIds: config.ADMIN_IDS,
    appUrl: config.APP_URL,
  });

  if (!config.BOT_TOKEN) {
    console.error("[TelegramBot] No bot token configured");
    return null;
  }

  // Initialize admins
  config.ADMIN_IDS.forEach(id => {
    if (!trustedUsers.has(id)) {
      trustedUsers.set(id, {
        id,
        level: "admin",
        approvedBy: id,
        approvedAt: new Date(),
      });
    }
  });

  bot = new Telegraf(config.BOT_TOKEN);

  // Start command
  bot.start((ctx) => {
    const isAdmin = config.ADMIN_IDS.includes(ctx.from.id);
    const isTrusted = trustedUsers.has(ctx.from.id);

    ctx.reply(
      `👋 Welcome to ICETracker MSP Bot!\n\n` +
      `This bot helps the Minneapolis community track ICE activity.\n\n` +
      `📍 View the map: ${config.APP_URL}\n\n` +
      `Commands:\n` +
      `/report - Submit a report (${isTrusted ? "✅ you're verified" : "requires verification"})\n` +
      `/register - Request verified reporter status\n` +
      `/status - Check your verification status\n` +
      (isAdmin ? `\n🔐 Admin commands:\n/pending - View pending requests\n/approve <user_id> - Approve a user\n/deny <user_id> - Deny a request\n/trusted - List trusted users` : "") +
      `\n\n⚠️ Always verify info with local rapid response networks.`
    );
  });

  // Help command
  bot.help((ctx) => {
    ctx.reply(
      `ICETracker MSP Bot Commands:\n\n` +
      `/report - Submit an ICE activity report\n` +
      `/register - Request verified status\n` +
      `/status - Check your status\n` +
      `/map - Get link to the map\n\n` +
      `📍 Map: ${config.APP_URL}`
    );
  });

  // Map link
  bot.command("map", (ctx) => {
    ctx.reply(`📍 View ICETracker MSP map:\n${config.APP_URL}`);
  });

  // Status check
  bot.command("status", (ctx) => {
    const user = trustedUsers.get(ctx.from.id);
    const pending = pendingRequests.has(ctx.from.id);

    if (user) {
      ctx.reply(
        `✅ You are a ${user.level} reporter.\n\n` +
        `You can submit reports using /report and they will be ${user.level === "trusted" || user.level === "admin" ? "auto-approved" : "expedited for review"}.`
      );
    } else if (pending) {
      ctx.reply(`⏳ Your verification request is pending review.`);
    } else {
      ctx.reply(
        `You are not yet verified.\n\n` +
        `Use /register to request verified status, or submit anonymous reports via the web: ${config.APP_URL}`
      );
    }
  });

  // Register for verification
  bot.command("register", (ctx) => {
    const userId = ctx.from.id;

    if (trustedUsers.has(userId)) {
      ctx.reply("✅ You're already verified!");
      return;
    }

    if (pendingRequests.has(userId)) {
      ctx.reply("⏳ Your request is already pending. An admin will review it soon.");
      return;
    }

    pendingRequests.set(userId, {
      id: userId,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      requestedAt: new Date(),
    });

    ctx.reply(
      "📝 Verification request submitted!\n\n" +
      "An admin will review your request. You'll be notified when approved.\n\n" +
      "In the meantime, you can submit reports via the web: " + config.APP_URL
    );

    // Notify admins
    config.ADMIN_IDS.forEach(adminId => {
      bot?.telegram.sendMessage(
        adminId,
        `🆕 New verification request:\n\n` +
        `User: ${ctx.from.first_name || "Unknown"} ${ctx.from.username ? `(@${ctx.from.username})` : ""}\n` +
        `ID: ${userId}\n\n` +
        `To approve: /approve ${userId}\n` +
        `To deny: /deny ${userId}`
      ).catch(console.error);
    });
  });

  // Report submission
  bot.command("report", async (ctx) => {
    const user = trustedUsers.get(ctx.from.id);

    if (!user) {
      ctx.reply(
        "❌ You need to be verified to submit reports via the bot.\n\n" +
        "Use /register to request verification, or submit anonymously via the web:\n" + config.APP_URL
      );
      return;
    }

    ctx.reply(
      "📍 To submit a report, use this format:\n\n" +
      "`/submit TYPE, Address, Description`\n\n" +
      "Types: CRITICAL, ACTIVE, OBSERVED, OTHER\n\n" +
      "Example:\n" +
      "`/submit ACTIVE, Lake Street & Chicago Ave, Two ICE vehicles spotted`",
      { parse_mode: "Markdown" }
    );
  });

  // Submit report command
  bot.command("submit", async (ctx) => {
    const user = trustedUsers.get(ctx.from.id);
    if (!user) {
      ctx.reply("❌ You need to be verified. Use /register first.");
      return;
    }

    const text = ctx.message.text.replace("/submit", "").trim();
    const parts = text.split(",").map(s => s.trim());

    if (parts.length < 3) {
      ctx.reply(
        "Please use the format:\n" +
        "`/submit TYPE, Address, Description`\n\n" +
        "Types: CRITICAL, ACTIVE, OBSERVED, OTHER\n\n" +
        "Example:\n" +
        "`/submit ACTIVE, Lake Street & Chicago Ave, Two ICE vehicles spotted`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const [typeStr, address, ...descParts] = parts;
    const type = typeStr.toUpperCase();
    const description = descParts.join(", ");

    if (!["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"].includes(type)) {
      ctx.reply("❌ Invalid type. Use: CRITICAL, ACTIVE, OBSERVED, or OTHER");
      return;
    }

    // Create the report via API
    try {
      const response = await fetch(`${config.APP_URL}/api/reports/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          address,
          description,
          telegramUserId: ctx.from.id,
          telegramUsername: ctx.from.username,
          userLevel: user.level,
        }),
      });

      if (response.ok) {
        const autoApproved = user.level === "trusted" || user.level === "admin";
        
        ctx.reply(
          `✅ Report submitted!\n\n` +
          `Type: ${type}\n` +
          `Location: ${address}\n\n` +
          (autoApproved 
            ? "Your report has been auto-approved and is now visible on the map." 
            : "Your report will be reviewed and appear on the map once approved.") +
          `\n\n📍 View map: ${config.APP_URL}`
        );
      } else {
        throw new Error("API error");
      }
    } catch (error) {
      ctx.reply("❌ Failed to submit report. Please try again or use the web form: " + config.APP_URL);
    }
  });

  // Admin: View pending requests
  bot.command("pending", (ctx) => {
    if (!config.ADMIN_IDS.includes(ctx.from.id)) {
      ctx.reply("❌ Admin only command.");
      return;
    }

    if (pendingRequests.size === 0) {
      ctx.reply("No pending verification requests.");
      return;
    }

    let msg = "📋 Pending verification requests:\n\n";
    pendingRequests.forEach((req, id) => {
      msg += `• ${req.firstName || "Unknown"} ${req.username ? `(@${req.username})` : ""}\n`;
      msg += `  ID: ${id}\n`;
      msg += `  Requested: ${req.requestedAt.toLocaleString()}\n`;
      msg += `  /approve ${id} | /deny ${id}\n\n`;
    });

    ctx.reply(msg);
  });

  // Admin: Approve user
  bot.command("approve", async (ctx) => {
    if (!config.ADMIN_IDS.includes(ctx.from.id)) {
      ctx.reply("❌ Admin only command.");
      return;
    }

    const userIdStr = ctx.message.text.replace("/approve", "").trim();
    const userId = parseInt(userIdStr);

    if (isNaN(userId)) {
      ctx.reply("Usage: /approve <user_id>");
      return;
    }

    const pending = pendingRequests.get(userId);
    if (!pending) {
      ctx.reply("No pending request found for that user ID.");
      return;
    }

    trustedUsers.set(userId, {
      id: userId,
      username: pending.username,
      firstName: pending.firstName,
      level: "verified",
      approvedBy: ctx.from.id,
      approvedAt: new Date(),
    });

    pendingRequests.delete(userId);

    ctx.reply(`✅ Approved ${pending.firstName || pending.username || userId} as verified reporter.`);

    // Notify the user
    bot?.telegram.sendMessage(
      userId,
      "🎉 Your verification request has been approved!\n\n" +
      "You can now submit reports using /report or /submit.\n" +
      "Your reports will be expedited for review.\n\n" +
      "Thank you for helping keep our community informed! 💪"
    ).catch(console.error);
  });

  // Admin: Deny request
  bot.command("deny", async (ctx) => {
    if (!config.ADMIN_IDS.includes(ctx.from.id)) {
      ctx.reply("❌ Admin only command.");
      return;
    }

    const userIdStr = ctx.message.text.replace("/deny", "").trim();
    const userId = parseInt(userIdStr);

    if (isNaN(userId)) {
      ctx.reply("Usage: /deny <user_id>");
      return;
    }

    const pending = pendingRequests.get(userId);
    if (!pending) {
      ctx.reply("No pending request found for that user ID.");
      return;
    }

    pendingRequests.delete(userId);
    ctx.reply(`❌ Denied request from ${pending.firstName || pending.username || userId}.`);

    // Notify the user
    bot?.telegram.sendMessage(
      userId,
      "Your verification request was not approved at this time.\n\n" +
      "You can still submit anonymous reports via the web: " + config.APP_URL
    ).catch(console.error);
  });

  // Admin: List trusted users
  bot.command("trusted", (ctx) => {
    if (!config.ADMIN_IDS.includes(ctx.from.id)) {
      ctx.reply("❌ Admin only command.");
      return;
    }

    if (trustedUsers.size === 0) {
      ctx.reply("No trusted users yet.");
      return;
    }

    let msg = "✅ Trusted users:\n\n";
    trustedUsers.forEach((user, id) => {
      msg += `• ${user.firstName || "Unknown"} ${user.username ? `(@${user.username})` : ""}\n`;
      msg += `  Level: ${user.level} | ID: ${id}\n\n`;
    });

    ctx.reply(msg);
  });

  // Admin: Add trusted partner (org level)
  bot.command("addtrusted", (ctx) => {
    if (!config.ADMIN_IDS.includes(ctx.from.id)) {
      ctx.reply("❌ Admin only command.");
      return;
    }

    const userIdStr = ctx.message.text.replace("/addtrusted", "").trim();
    const userId = parseInt(userIdStr);

    if (isNaN(userId)) {
      ctx.reply("Usage: /addtrusted <user_id>");
      return;
    }

    trustedUsers.set(userId, {
      id: userId,
      level: "trusted",
      approvedBy: ctx.from.id,
      approvedAt: new Date(),
    });

    ctx.reply(`✅ Added ${userId} as trusted partner. Their reports will be auto-approved.`);
  });

  return bot;
}

// Broadcast alert to channel
export async function broadcastAlert(report: {
  type: string;
  title: string;
  address?: string;
  description: string;
  reportedAt: string;
  id: string;
}) {
  if (!bot || !config?.CHANNEL_ID) {
    console.log("[TelegramBot] Cannot broadcast - bot or channel not configured");
    return;
  }

  const typeEmoji: Record<string, string> = {
    CRITICAL: "🔴",
    ACTIVE: "🟠",
    OBSERVED: "🟡",
    OTHER: "⚪",
  };

  const emoji = typeEmoji[report.type] || "📍";
  const time = new Date(report.reportedAt).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const message = 
    `${emoji} <b>${report.type}: ${report.title}</b>\n\n` +
    (report.address ? `📍 ${report.address}\n` : "") +
    `🕐 ${time}\n\n` +
    `${report.description}\n\n` +
    `<a href="${config.APP_URL}">View on map →</a>\n\n` +
    `⚠️ Always verify with local RRN`;

  try {
    await bot.telegram.sendMessage(config.CHANNEL_ID, message, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    console.log("[TelegramBot] Alert broadcast to channel");
  } catch (error) {
    console.error("[TelegramBot] Failed to broadcast:", error);
  }
}

export function getBot() {
  return bot;
}

export function getTrustedUsers() {
  return trustedUsers;
}

export function getPendingRequests() {
  return pendingRequests;
}
