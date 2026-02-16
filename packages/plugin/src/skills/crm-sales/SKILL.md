# CRM Sales

Manage customer orders and product inquiries through ClawCRM.

## Capabilities

- Create new orders on behalf of authenticated users
- List and filter orders by status
- Update order status and notes
- Search products and order history

## Usage

When a user asks to order something or inquires about their orders,
use the `crm_create_order`, `crm_list_orders`, and `crm_update_order` tools.

Always verify the user is authenticated before processing orders.
All data is scoped — users only see their own orders unless explicitly permitted.

## Permissions

This skill requires `skill:crm-sales:execute` permission.
Granted by default to all authenticated users.
