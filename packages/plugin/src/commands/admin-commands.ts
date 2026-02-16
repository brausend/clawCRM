import { resolveIdentity } from "../auth/identity-resolver.js";
import { findUserById } from "../auth/auth-service.js";

/**
 * /crm-admin — Quick admin panel info.
 */
export const crmAdminCommand = {
  name: "crm-admin",
  description: "Admin panel: manage users, permissions, and modules.",
  requireAuth: true,
  acceptsArgs: true,
  handler: async (ctx: {
    senderId?: string;
    channel?: string;
    args?: string;
    isAuthorizedSender?: boolean;
  }) => {
    if (!ctx.isAuthorizedSender) {
      return { text: "Admin access required." };
    }

    return {
      text: [
        "ClawCRM Admin Panel",
        "Use agent tools for full admin capabilities:",
        "- crm_admin_users: Manage users",
        "- crm_admin_permissions: Manage permissions",
        "- crm_admin_instance_key: Manage frontend pairing",
        "",
        "Or visit the web dashboard: /admin",
      ].join("\n"),
    };
  },
};
