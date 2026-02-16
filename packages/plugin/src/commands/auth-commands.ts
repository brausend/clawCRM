import { resolveIdentity } from "../auth/identity-resolver.js";
import { findUserById } from "../auth/auth-service.js";

/**
 * /crm-auth — Check auth status and generate an auth link if needed.
 */
export const crmAuthCommand = {
  name: "crm-auth",
  description: "Check your authentication status or get an auth link.",
  requireAuth: false,
  acceptsArgs: false,
  handler: async (ctx: {
    senderId?: string;
    channel?: string;
    config: unknown;
  }) => {
    if (!ctx.senderId || !ctx.channel) {
      return { text: "Cannot determine sender. Please try from a supported channel." };
    }

    const identity = await resolveIdentity(ctx.channel, ctx.senderId);
    if (!identity) {
      return {
        text: "You are not authenticated. Please visit your ClawCRM dashboard to link this channel, or ask an admin to create your account.",
      };
    }

    const user = await findUserById(identity.userId);
    if (!user) {
      return { text: "Account found but user data is missing. Contact an admin." };
    }

    return {
      text: `Authenticated as ${user.displayName} (${user.role}). Channel: ${ctx.channel}`,
    };
  },
};

/**
 * /crm-link — Link a new channel to an existing account.
 */
export const crmLinkCommand = {
  name: "crm-link",
  description: "Link this channel to your existing ClawCRM account.",
  requireAuth: false,
  acceptsArgs: false,
  handler: async (ctx: { senderId?: string; channel?: string }) => {
    if (!ctx.senderId || !ctx.channel) {
      return { text: "Cannot determine sender." };
    }

    const identity = await resolveIdentity(ctx.channel, ctx.senderId);
    if (identity) {
      return { text: "This channel is already linked to your account." };
    }

    return {
      text: "To link this channel, visit your ClawCRM dashboard and add this channel in your profile settings.",
    };
  },
};
