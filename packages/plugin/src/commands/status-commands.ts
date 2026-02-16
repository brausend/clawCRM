import { resolveIdentity, getUserChannels } from "../auth/identity-resolver.js";
import { findUserById } from "../auth/auth-service.js";
import { getAllModules } from "../modules/registry.js";

/**
 * /crm-whoami — Show current user info and linked channels.
 */
export const crmWhoamiCommand = {
  name: "crm-whoami",
  description: "Show your ClawCRM user info and linked channels.",
  requireAuth: false,
  acceptsArgs: false,
  handler: async (ctx: { senderId?: string; channel?: string }) => {
    if (!ctx.senderId || !ctx.channel) {
      return { text: "Cannot determine sender." };
    }

    const identity = await resolveIdentity(ctx.channel, ctx.senderId);
    if (!identity) {
      return { text: "Not authenticated. Use /crm-auth to get started." };
    }

    const user = await findUserById(identity.userId);
    if (!user) {
      return { text: "User not found." };
    }

    const channels = await getUserChannels(identity.userId);
    const channelList = channels
      .map((c) => `  - ${c.channel} (${c.verified ? "verified" : "unverified"})`)
      .join("\n");

    return {
      text: [
        `Name: ${user.displayName}`,
        `Role: ${user.role}`,
        `Email: ${user.email ?? "not set"}`,
        `Linked channels:\n${channelList}`,
      ].join("\n"),
    };
  },
};

/**
 * /crm-status — Show system status.
 */
export const crmStatusCommand = {
  name: "crm-status",
  description: "Show ClawCRM system status.",
  requireAuth: false,
  acceptsArgs: false,
  handler: async () => {
    const modules = getAllModules();
    return {
      text: [
        "ClawCRM Status: Online",
        `Loaded modules: ${modules.length > 0 ? modules.map((m) => m.name).join(", ") : "none"}`,
      ].join("\n"),
    };
  },
};
