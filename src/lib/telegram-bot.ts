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

interface AlertSubscription {
  id: number;
  zipCode: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  active: boolean;
  createdAt: Date;
}

const trustedUsers: Map<number, TrustedUser> = new Map();
const pendingRequests: Map<number, PendingRequest> = new Map();
const alertSubscriptions: Map<number, AlertSubscription> = new Map();

// Calculate distance between two points in miles (Haversine formula)
function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Lookup zip code coordinates using free API
async function lookupZipCode(zipCode: string): Promise<{ lat: number; lng: number; city: string; state: string } | null> {
  try {
    // Using Zippopotam.us free API
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude),
        city: place["place name"],
        state: place["state abbreviation"],
      };
    }
    return null;
  } catch (error) {
    console.error("[TelegramBot] Zip code lookup failed:", error);
    return null;
  }
}

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
    const hasAlerts = alertSubscriptions.has(ctx.from.id);

    ctx.reply(
      `👋 Welcome to ICETracker MSP Bot!\n\n` +
      `This bot helps the Minneapolis community track ICE activity.\n\n` +
      `📍 View the map: ${config.APP_URL}\n\n` +
      `🔔 <b>Get alerts near you:</b>\n` +
      `/alerts 55401 — alerts within 5 miles of zip code\n` +
      `/alerts 55401 10 — customize radius (1-50 miles)\n` +
      (hasAlerts ? `✅ You have alerts enabled\n` : ``) +
      `\n📝 <b>Other commands:</b>\n` +
      `/report - Submit a report (${isTrusted ? "✅ you're verified" : "requires verification"})\n` +
      `/register - Request verified reporter status\n` +
      `/status - Check your verification status\n` +
      `/map - View the live map\n` +
      (isAdmin ? `\n🔐 Admin commands:\n/pending - View pending requests\n/approve <user_id> - Approve a user\n/deny <user_id> - Deny a request\n/trusted - List trusted users` : "") +
      `\n\n⚠️ Always verify info with local rapid response networks.`,
      { parse_mode: "HTML" }
    );
  });

  // Help command
  bot.help((ctx) => {
    ctx.reply(
      `<b>ICETracker MSP Bot Commands</b>\n\n` +
      `🔔 <b>Proximity Alerts:</b>\n` +
      `/alerts <zip> — get alerts near your zip code\n` +
      `/alerts <zip> <miles> — set custom radius\n` +
      `/alerts off — stop alerts\n\n` +
      `📝 <b>Reporting:</b>\n` +
      `/report - Submit an ICE activity report\n` +
      `/submit - Quick report submission\n` +
      `/register - Request verified status\n` +
      `/status - Check your verification status\n\n` +
      `📍 Map: ${config.APP_URL}`,
      { parse_mode: "HTML" }
    );
  });

  // Map link
  bot.command("map", (ctx) => {
    ctx.reply(`📍 View ICETracker MSP map:\n${config.APP_URL}`);
  });

  // Alerts subscription by zip code
  bot.command("alerts", async (ctx) => {
    const args = ctx.message.text.replace("/alerts", "").trim();
    
    // Check if turning off
    if (args.toLowerCase() === "off" || args.toLowerCase() === "stop") {
      const existing = alertSubscriptions.get(ctx.from.id);
      if (existing) {
        alertSubscriptions.delete(ctx.from.id);
        ctx.reply("🔕 Alert subscription cancelled. You will no longer receive proximity alerts.\n\nUse /alerts <zip> to subscribe again.");
      } else {
        ctx.reply("You don't have an active alert subscription.");
      }
      return;
    }

    // Check if checking status
    if (args.toLowerCase() === "status" || args === "") {
      const existing = alertSubscriptions.get(ctx.from.id);
      if (existing) {
        ctx.reply(
          `📍 Your alert subscription:\n\n` +
          `Zip Code: ${existing.zipCode}\n` +
          `Radius: ${existing.radiusMiles} miles\n` +
          `Status: ${existing.active ? "✅ Active" : "❌ Inactive"}\n\n` +
          `To change: /alerts <new zip> [radius]\n` +
          `To stop: /alerts off`
        );
      } else {
        ctx.reply(
          `🔔 Get notified when ICE is spotted near you!\n\n` +
          `Usage: /alerts <zip code> [radius in miles]\n\n` +
          `Examples:\n` +
          `• /alerts 55401 — alerts within 5 miles (default)\n` +
          `• /alerts 55401 10 — alerts within 10 miles\n` +
          `• /alerts off — stop alerts\n\n` +
          `You'll receive a DM whenever activity is reported near your location.`
        );
      }
      return;
    }

    // Parse zip code and optional radius
    const parts = args.split(/\s+/);
    const zipCode = parts[0];
    const radiusMiles = parts[1] ? parseInt(parts[1]) : 5;

    // Validate zip code format
    if (!/^\d{5}$/.test(zipCode)) {
      ctx.reply("❌ Please enter a valid 5-digit US zip code.\n\nExample: /alerts 55401");
      return;
    }

    // Validate radius
    if (isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 50) {
      ctx.reply("❌ Radius must be between 1 and 50 miles.\n\nExample: /alerts 55401 10");
      return;
    }

    // Look up zip code
    const location = await lookupZipCode(zipCode);
    if (!location) {
      ctx.reply("❌ Couldn't find that zip code. Please check and try again.");
      return;
    }

    // Save subscription
    alertSubscriptions.set(ctx.from.id, {
      id: ctx.from.id,
      zipCode,
      latitude: location.lat,
      longitude: location.lng,
      radiusMiles,
      active: true,
      createdAt: new Date(),
    });

    ctx.reply(
      `✅ Alert subscription activated!\n\n` +
      `📍 Location: ${location.city}, ${location.state} (${zipCode})\n` +
      `📏 Radius: ${radiusMiles} miles\n\n` +
      `You'll receive a DM when ICE activity is reported within ${radiusMiles} miles of your location.\n\n` +
      `• /alerts status — check your subscription\n` +
      `• /alerts off — stop alerts`
    );

    console.log(`[TelegramBot] New alert subscription: user ${ctx.from.id} -> ${zipCode} (${radiusMiles}mi)`);
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

      const data = await response.json();

      if (response.ok && data.success) {
        const autoApproved = data.report?.autoApproved || user.level === "trusted" || user.level === "admin";
        
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
        const errorMsg = data.error || "Unknown error";
        ctx.reply(`❌ ${errorMsg}\n\nTry being more specific with the address, or use the web form: ${config.APP_URL}`);
      }
    } catch (error) {
      console.error("[TelegramBot] Submit error:", error);
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

// Broadcast alert to channel and nearby subscribers
export async function broadcastAlert(report: {
  type: string;
  title: string;
  address?: string;
  description: string;
  reportedAt: string;
  id: string;
  latitude?: number;
  longitude?: number;
  verificationLevel?: string;
  source?: string;
}) {
  if (!bot) {
    console.log("[TelegramBot] Cannot broadcast - bot not configured");
    return;
  }

  const typeEmoji: Record<string, string> = {
    CRITICAL: "🔴",
    ACTIVE: "🟠",
    OBSERVED: "🟡",
    OTHER: "⚪",
  };

  const emoji = typeEmoji[report.type] || "📍";
  const reportTime = new Date(report.reportedAt);
  const now = new Date();
  const minutesAgo = Math.floor((now.getTime() - reportTime.getTime()) / 60000);
  
  const timeStr = reportTime.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  const timeAgo = minutesAgo < 60 
    ? `${minutesAgo} min ago`
    : minutesAgo < 1440 
      ? `${Math.floor(minutesAgo / 60)}h ago`
      : `${Math.floor(minutesAgo / 1440)}d ago`;

  // Build Google Maps link
  const mapsLink = report.latitude && report.longitude
    ? `https://maps.google.com/?q=${report.latitude},${report.longitude}`
    : null;

  const isVerified = report.verificationLevel === "TRUSTED" || report.source === "AGGREGATED";
  const statusLine = isVerified ? "✅ Verified" : "⚠️ Unconfirmed";
  const headerLine = isVerified ? "✅ ICE ACTIVITY VERIFIED" : `${emoji} ICE AGENTS REPORTED`;

  let channelMessage = `<b>${headerLine}</b>\n\n`;
  
  if (report.address) {
    channelMessage += `📍 ${report.address}\n`;
  }
  
  if (mapsLink) {
    channelMessage += `🗺 <a href="${mapsLink}">View on Map</a>\n`;
  }
  
  channelMessage += `⏰ ${timeStr} (${timeAgo})\n`;
  channelMessage += `${statusLine}\n\n`;
  
  if (report.description) {
    channelMessage += `${report.description}\n\n`;
  }
  
  channelMessage += `<a href="${config.APP_URL}">View full map →</a>`;

  // Broadcast to channel
  if (config?.CHANNEL_ID) {
    try {
      await bot.telegram.sendMessage(config.CHANNEL_ID, channelMessage, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
      console.log("[TelegramBot] Alert broadcast to channel");
    } catch (error) {
      console.error("[TelegramBot] Failed to broadcast to channel:", error);
    }
  }

  // Send personalized alerts to nearby subscribers
  if (report.latitude && report.longitude) {
    const nearbySubscribers: { sub: AlertSubscription; distance: number }[] = [];
    
    alertSubscriptions.forEach((sub) => {
      if (!sub.active) return;
      const distance = getDistanceMiles(sub.latitude, sub.longitude, report.latitude!, report.longitude!);
      if (distance <= sub.radiusMiles) {
        nearbySubscribers.push({ sub, distance });
      }
    });

    if (nearbySubscribers.length > 0) {
      console.log(`[TelegramBot] Notifying ${nearbySubscribers.length} nearby subscribers`);
      
      for (const { sub, distance } of nearbySubscribers) {
        const distanceStr = distance < 1 
          ? `${Math.round(distance * 5280)} feet` 
          : `${distance.toFixed(1)} miles`;
        
        let dmMessage = `🚨 <b>ICE ACTIVITY NEAR YOU</b>\n\n`;
        dmMessage += `📏 <b>${distanceStr} from your location</b>\n\n`;
        
        if (report.address) {
          dmMessage += `📍 ${report.address}\n`;
        }
        
        if (mapsLink) {
          dmMessage += `🗺 <a href="${mapsLink}">View on Map</a>\n`;
        }
        
        dmMessage += `⏰ ${timeStr}\n`;
        dmMessage += `${statusLine}\n\n`;
        
        if (report.description) {
          dmMessage += `${report.description}\n\n`;
        }
        
        dmMessage += `<a href="${config.APP_URL}">View full map →</a>\n\n`;
        dmMessage += `<i>To change alerts: /alerts status</i>`;

        try {
          await bot.telegram.sendMessage(sub.id, dmMessage, {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
          });
        } catch (error) {
          console.error(`[TelegramBot] Failed to DM subscriber ${sub.id}:`, error);
          // If we can't message them, deactivate subscription
          sub.active = false;
        }
      }
    }
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
