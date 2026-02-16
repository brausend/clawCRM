# ClawCRM

A modular CRM plugin for [OpenClaw](https://docs.openclaw.ai) with a standalone web dashboard. Provides multi-channel user authentication, role-based access control (RBAC), and an extensible module system.

## Features

- **Multi-Channel Identity** — Users can interact via Telegram, WhatsApp, Slack, Discord, Teams, Matrix, Nostr, or any other OpenClaw channel. All channel identities are linked to a single CRM user.
- **Passkey Authentication (WebAuthn)** — Passwordless login for both channel linking and the web dashboard.
- **Default-Deny RBAC** — No cross-user data access unless explicitly granted by an admin. Skills, modules, and data scopes are all permission-gated.
- **Web Dashboard** — Standalone React SPA that communicates with the plugin via WebSocket. Deployable on any server/CDN.
- **Instance Pairing** — Secure one-time pairing between the frontend and the OpenClaw backend using instance keys.
- **Modular Extension System** — Third-party modules can add database schemas, agent tools, WebSocket RPC methods, and dashboard UI components.
- **Group Chat Support** — Per-sender data isolation in group chats; sensitive data sent via DM.

## Architecture

```
┌─────────────────┐    ┌──────────────────────────────┐    ┌─────────────┐
│  Chat Channels   │───▶│  ClawCRM Plugin (OpenClaw)    │◀───│  Web Dashboard│
│  (TG, WA, etc.) │    │                              │    │  (React SPA)│
└─────────────────┘    │  ┌─────────────────────────┐ │    └──────┬──────┘
                       │  │ Identity Resolver        │ │           │
                       │  │ Auth Service (Passkey)   │ │      WebSocket
                       │  │ Permission Engine (RBAC) │ │           │
                       │  │ Agent Tools              │ │    ┌──────┴──────┐
                       │  │ Module Registry          │ │    │ Passkey Login│
                       │  │ WebSocket Server         │ │    │ Chats/Orders│
                       │  └───────────┬─────────────┘ │    │ Admin Panel │
                       │              │                │    └─────────────┘
                       │     ┌────────┴────────┐      │
                       │     │ SQLite (Drizzle) │      │
                       │     └─────────────────┘      │
                       └──────────────────────────────┘
```

## Project Structure

```
clawCRM/
├── packages/
│   ├── shared/          # @clawcrm/shared — Types, WS protocol, module interface
│   ├── plugin/          # @clawcrm/plugin — OpenClaw plugin (backend)
│   │   ├── src/
│   │   │   ├── auth/        # Identity resolver, auth service, passkey
│   │   │   ├── rbac/        # Permission engine, policies, scopes
│   │   │   ├── tools/       # Agent tools (orders, contacts, projects, admin)
│   │   │   ├── commands/    # Slash commands (/crm-auth, /crm-whoami, etc.)
│   │   │   ├── services/    # WebSocket server, session manager, chat sync
│   │   │   ├── modules/     # Module registry + built-in modules
│   │   │   ├── rpc/         # WebSocket RPC handlers
│   │   │   ├── skills/      # SKILL.md files (sales, support, admin)
│   │   │   └── db/          # Drizzle schema + SQLite client
│   │   └── openclaw.plugin.json
│   ├── web/             # @clawcrm/web — React dashboard (Vite + Tailwind)
│   └── modules/
│       └── contracts/   # @clawcrm/module-contracts — Example extension module
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm
- An OpenClaw instance

### Installation

```bash
git clone https://github.com/brausend/clawnCRM.git
cd clawCRM
pnpm install
```

### Plugin Setup

1. Copy or link the `packages/plugin` directory into your OpenClaw extensions:

```bash
# Option A: Link for development
openclaw plugins install -l ./packages/plugin

# Option B: Load via config path
# Add to your OpenClaw config:
# plugins.load.paths: ["./path/to/clawCRM/packages/plugin"]
```

2. Configure the plugin in your OpenClaw config:

```json5
{
  plugins: {
    entries: {
      clawcrm: {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/clawcrm.db",
          wsPort: 3848,
          wsAllowedOrigins: ["https://crm.example.com", "http://localhost:5173"],
          defaultPolicy: "deny-all",
          adminUsers: ["admin@example.com"],
          modules: [],
          maxPairedInstances: 3
        }
      }
    }
  }
}
```

3. Restart the OpenClaw gateway.

### Web Dashboard Setup

1. Generate an instance key:

```
/crm-admin generate-instance-key
```

2. Configure the frontend:

```bash
cd packages/web
cp .env.example .env
# Edit .env:
# VITE_WS_URL=wss://your-openclaw-server:3848
# VITE_INSTANCE_KEY=ik_...
```

3. Run the dashboard:

```bash
pnpm dev:web          # Development
pnpm --filter @clawcrm/web build  # Production build
```

The built SPA can be deployed to any static hosting (Vercel, Netlify, Nginx, etc.).

### Frontend-Backend Pairing

The first time the frontend connects, it uses the instance key for a one-time pairing. After pairing:

- The key is consumed and cannot be reused
- A persistent `wsToken` is stored in localStorage
- The frontend reconnects automatically using the token
- To re-pair, rotate the key: `/crm-admin rotate-instance-key`

## Agent Tools

| Tool | Description | Access |
|------|------------|--------|
| `crm_auth_status` | Check auth status | Public |
| `crm_list_orders` | List orders | Own data |
| `crm_create_order` | Create order | Authenticated |
| `crm_update_order` | Update order | Own / Admin |
| `crm_list_contacts` | List contacts | Scoped |
| `crm_search` | Global search | Scoped |
| `crm_manage_project` | Project CRUD | Member / Admin |
| `crm_manage_tasks` | Task CRUD | Member / Admin |
| `crm_admin_permissions` | Manage permissions | Admin only |
| `crm_admin_users` | Manage users | Admin only |
| `crm_admin_instance_key` | Manage pairing | Admin only |

## Slash Commands

- `/crm-auth` — Check auth status
- `/crm-link` — Link a new channel
- `/crm-whoami` — Show user info
- `/crm-admin` — Admin panel
- `/crm-status` — System status

## Module System

Modules extend ClawCRM with custom data types, tools, and UI. See `packages/modules/contracts` for a reference implementation.

A module implements the `CrmModule` interface:

```typescript
interface CrmModule {
  id: string;
  name: string;
  version: string;
  schema?: Record<string, unknown>;     // DB schema extensions
  tools?: ModuleToolDefinition[];       // Agent tools
  rpcMethods?: ModuleRpcDefinition[];   // WebSocket RPC
  ui?: ModuleUiDescriptor;              // Dashboard components
  onInstall?(ctx): Promise<void>;       // Migration hook
  onEnable?(ctx): void;
  onDisable?(): void;
}
```

Add modules to the config:

```json5
{
  modules: ["@clawcrm/module-contracts"]
}
```

## Deployment

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Remote Server / VPS / Cloud                             │
│                                                          │
│  ┌────────────────────┐     ┌─────────────────────────┐  │
│  │  OpenClaw Gateway   │◀───│  Chat Channels (TG, WA) │  │
│  │  + ClawCRM Plugin   │    └─────────────────────────┘  │
│  │                     │                                 │
│  │  Port 3848 (WS)     │◀──── WebSocket ────┐           │
│  └────────────────────┘                     │           │
│                                              │           │
│  ┌────────────────────┐                     │           │
│  │  Web Dashboard      │  ◀── Browser ──────┘           │
│  │  (nginx, Port 80)   │                                │
│  └────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

**Important:** The plugin runs _inside_ OpenClaw. The web SPA communicates with the plugin via WebSocket (port 3848). Both can run on the same server.

### Docker Compose (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/brausend/clawnCRM.git && cd clawCRM

# 2. Configure environment
cp .env.production.example .env

# 3. Start services
docker compose up -d

# 4. Generate an instance key (in the bot chat)
/crm-admin generate-instance-key

# 5. Add the key to .env and rebuild the web container
docker compose up -d --build web
```

### Web Dashboard Only (Docker)

If OpenClaw is already running and you only need to deploy the dashboard:

```bash
docker build \
  --build-arg VITE_WS_URL=wss://your-server:3848 \
  --build-arg VITE_INSTANCE_KEY=ik_xxx \
  -f packages/web/Dockerfile \
  -t clawcrm-web .

docker run -d -p 8080:80 --name clawcrm-web clawcrm-web
```

### Plugin Only (without Docker)

```bash
# Install the plugin into an existing OpenClaw instance
pnpm install && pnpm build
openclaw plugins install -l ./packages/plugin
```

### Reverse Proxy (Production)

For HTTPS/WSS a reverse proxy (e.g. Caddy, Traefik, nginx) is recommended:

```
crm.example.com        → :8080 (Web Dashboard)
crm.example.com:3848   → :3848 (WebSocket, upgrade)
```

Caddy example:
```
crm.example.com {
    reverse_proxy localhost:8080
}
crm.example.com:3848 {
    reverse_proxy localhost:3848
}
```

### Plugin ↔ Dashboard Communication

1. **Pairing**: Dashboard sends `pair:request` with instance key → plugin responds with `wsToken`
2. **Auth**: Dashboard authenticates via Passkey (WebAuthn) over the WebSocket
3. **RPC**: All data operations use `rpc:request` / `rpc:response` messages
4. **Realtime**: Plugin pushes updates via `data` messages to subscribed clients
5. **Reconnect**: Dashboard uses the stored `wsToken` for automatic reconnects

Protocol details: see `packages/shared/src/ws-protocol.ts`

## RBAC

- **Default-deny**: No cross-user access without explicit permission
- **Own data**: Users always see their own orders, chats, projects
- **Admin bypass**: Admins have full access
- **Granular permissions**: Per user, group, or role — for any resource, skill, or module
- **Skill gating**: Skills must be explicitly enabled per user/group

## Testing

```bash
cd packages/plugin
pnpm test
```

## License

MIT
