# CRM Support

Handle customer support requests and account inquiries through ClawCRM.

## Capabilities

- Check authentication status and guide users through auth flow
- Look up user account information
- Help users link new channels to their account
- Provide order status updates

## Usage

When a user needs help with their account, authentication, or has questions
about their data, use the `crm_auth_status` tool and guide them.

For order-related support, use `crm_list_orders` and `crm_update_order`.

## Permissions

This skill requires `skill:crm-support:execute` permission.
Granted by default to all authenticated users.
