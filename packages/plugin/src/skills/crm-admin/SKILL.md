# CRM Admin

Administrative capabilities for managing ClawCRM users, permissions, and modules.

## Capabilities

- Manage users: list, set roles (admin/user/guest)
- Manage permissions: grant and revoke access to resources, skills, and modules
- Manage frontend instance pairing: generate keys, rotate keys, list instances
- View audit logs
- Manage CRM modules

## Usage

Use `crm_admin_users` to manage user accounts and roles.
Use `crm_admin_permissions` to control who can access what.
Use `crm_admin_instance_key` to manage frontend-backend pairing.

## Permissions

This skill requires `admin` role. Regular users cannot access admin tools.
