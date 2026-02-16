import { Type } from "@sinclair/typebox";
import { resolveIdentity, getUserChannels } from "../auth/identity-resolver.js";
import { findUserById } from "../auth/auth-service.js";

export const crmAuthStatusTool = {
  name: "crm_auth_status",
  description:
    "Check the authentication status of the current user and list linked channels.",
  parameters: Type.Object({}),
  async execute(_id: string, _params: unknown, ctx: { senderId?: string; channel?: string }) {
    if (!ctx.senderId || !ctx.channel) {
      return {
        content: [
          {
            type: "text",
            text: "No sender context available. Cannot determine auth status.",
          },
        ],
      };
    }

    const identity = await resolveIdentity(ctx.channel, ctx.senderId);
    if (!identity) {
      return {
        content: [
          {
            type: "text",
            text: "Not authenticated. Use /crm-auth to link this channel to your account.",
          },
        ],
      };
    }

    const user = await findUserById(identity.userId);
    const channels = await getUserChannels(identity.userId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              authenticated: true,
              user: user
                ? { id: user.id, name: user.displayName, role: user.role }
                : null,
              linkedChannels: channels.map((c) => ({
                channel: c.channel,
                verified: c.verified,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
