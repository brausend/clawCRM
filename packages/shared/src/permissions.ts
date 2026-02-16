// Permission resource and action constants

export const Resources = {
  SKILL: "skill",
  DATA_SCOPE: "data_scope",
  PROJECT: "project",
  ORDERS: "orders",
  CONTACTS: "contacts",
  MODULE: "module",
  ADMIN: "admin",
  TAGS: "tags",
  COMMENTS: "comments",
  EXPORT: "export",
} as const;

export const Actions = {
  READ: "read",
  WRITE: "write",
  EXECUTE: "execute",
  ADMIN: "admin",
} as const;

export type Resource = (typeof Resources)[keyof typeof Resources];
export type Action = (typeof Actions)[keyof typeof Actions];

export interface PermissionCheck {
  userId: string;
  resource: Resource | string;
  resourceId: string;
  action: Action;
}
