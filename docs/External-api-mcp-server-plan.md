# External API & MCP Server Architecture Plan
## Leads & Opportunities Integration for KDADKS CRM

---

## 1. Recommended Tech Stack & Architecture

### Architecture
```
External Apps (Zapier/Make/AI Agents)
  │ HTTPS/REST + MCP
  ▼
[ Reverse Proxy / Edge ]
  │ TLS termination, WAF, CORS, IP allowlist
  ▼
┌─────────────┐    ┌──────────────────┐
│ REST API    │    │ MCP Server       │
│ Express     │    │ @modelcontext... │
│ /api/v1/*   │    │ SSE/stdio        │
└─────┬───────┘    └───────┬──────────┘
      │                    │
      └────────┬───────────┘
               ▼
      ┌───────────────────┐
      │ Service Layer     │
      │ leadService,      │
      │ opportunityService│
      └─────────┬─────────┘
                ▼
      ┌─────────────────────┐
      │ Supabase (Postgres) │
      │ RLS + Vault + Auth  │
      └─────────────────────┘
```

### Stack
| Layer | Tech | Notes |
|-------|------|-------|
| Runtime | Node.js 20 LTS | Already used |
| REST | Express + TypeScript | Existing app style |
| MCP | `@modelcontextprotocol/sdk` | SSE + stdio transports |
| Validation | Zod | Shared schemas for REST + MCP |
| Rate limit | `express-rate-limit` + ioredis | Centralized Redis store |
| Auth | API key (primary) + OAuth2 client credentials (enterprise) | Supabase Auth for internal users |
| Secrets | Supabase Vault / env + Doppler | No committed secrets |
| Queue | BullMQ + Redis | Async audit + webhooks |
| Docs | OpenAPI 3.1 + Scalar UI | Auto-generated from Zod |

---

## 2. Authentication & Authorization (Enterprise Grade)

### Primary: API Keys
- **Storage**: `api_credentials` table with `key_hash = SHA256(key)`, `key_prefix` for UI, `key_last4`
- **Header**: `X-API-Key` or `Authorization: Bearer`
- **Scopes**: `leads:read`, `leads:write`, `opportunities:read`, `opportunities:write`, `audit:read`
- **Tenancy**: Optional `company_settings_id` restriction
- **Expiry**: Required `expires_at`; max 90 days; warn at 14 days
- **Revocation**: Soft delete via `is_active`; immediate revocation propagates to all nodes via Redis cache invalidation

### Secondary: OAuth2 Client Credentials (Enterprise Partners)
- Provider: **Supabase Auth** as OAuth2 Authorization Server
- Flow: client_id + client_secret → `/api/v1/auth/token` → access_token (JWT) → API
- Scopes mapped to API key scopes
- Introspection endpoint: `/api/v1/auth/introspect`
- Token TTL: 1 hour with refresh tokens

### Rate Limiting
| Tier | Requests/min | Burst | Notes |
|------|-------------|-------|-------|
| Trial | 60 | 10 | Single entity |
| Standard | 300 | 50 | Multi-entity |
| Enterprise | 1000 | 200 | SLA-backed |

### Authorization Model
```typescript
interface ApiCredential {
  id: string;
  key_hash: string;
  key_prefix: string;        // e.g. "kd_live_"
  key_last4: string;
  name: string;
  scopes: string[];
  company_settings_id?: string;
  allowed_ips?: string[];
  expires_at: string;        // required
  last_used_at?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}
```

---

## 3. Data Models & Validation

### Database Tables
```sql
CREATE TABLE api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  company_settings_id UUID REFERENCES company_settings(id),
  allowed_ips TEXT[],
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  api_credential_id UUID REFERENCES api_credentials(id),
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_id UUID NOT NULL,
  payload JSONB,
  changes JSONB,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_credential ON audit_logs(api_credential_id, created_at);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
```

### Validation Schemas (Zod)
```typescript
import { z } from 'zod';

export const CreateLeadSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  job_title: z.string().max(100).optional().nullable(),
  company_name: z.string().max(255).optional().nullable(),
  source: z.enum(['website','referral','campaign','social_media','cold_outreach','partner','other']),
  budget_min: z.coerce.number().nonnegative().optional().nullable(),
  budget_max: z.coerce.number().nonnegative().optional().nullable(),
  currency_code: z.string().length(3).optional().nullable(),
  expected_close_date: z.string().datetime().optional().nullable(),
  gstin: z.string().max(15).optional().nullable(),
  pan: z.string().max(10).optional().nullable(),
  vat_number: z.string().max(50).optional().nullable(),
  cro_number: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
}).strict();

export const UpdateLeadSchema = CreateLeadSchema.partial().required({ id: z.string() });

export const CreateOpportunitySchema = z.object({
  opportunity_name: z.string().min(1).max(255),
  customer_id: z.string().uuid(),
  lead_id: z.string().uuid().optional().nullable(),
  source_lead_id: z.string().uuid().optional().nullable(),
  stage: z.enum(['prospecting','qualification','proposal','negotiation','closed_won','closed_lost']).optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  estimated_value: z.coerce.number().nonnegative().optional(),
  currency_code: z.string().length(3).optional(),
  expected_close_date: z.string().datetime().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  next_steps: z.string().max(1000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
}).strict();

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial().required({ id: z.string() });
```

---

## 4. API Endpoints & MCP Tools

### REST Endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/api/v1/leads` | `leads:write` | Create lead |
| GET | `/api/v1/leads/:id` | `leads:read` | Get lead by UUID or lead_number |
| GET | `/api/v1/leads` | `leads:read` | List leads (paginated, max 100) |
| PATCH | `/api/v1/leads/:id` | `leads:write` | Update lead |
| POST | `/api/v1/opportunities` | `opportunities:write` | Create opportunity |
| GET | `/api/v1/opportunities/:id` | `opportunities:read` | Get opportunity |
| GET | `/api/v1/opportunities` | `opportunities:read` | List opportunities |
| PATCH | `/api/v1/opportunities/:id` | `opportunities:write` | Update opportunity |
| POST | `/api/v1/auth/token` | — | OAuth2 client_credentials token |
| POST | `/api/v1/auth/introspect` | — | Introspect access token |
| POST | `/api/v1/keys` | — | Create API key (admin) |
| DELETE | `/api/v1/keys/:id` | — | Revoke API key |
| GET | `/api/v1/keys` | — | List keys (admin) |

### MCP Tools
| Tool | Input Schema | Description |
|------|--------------|-------------|
| `create_lead` | same as CreateLeadSchema | Create lead |
| `update_lead` | `id` + UpdateLeadSchema | Update lead |
| `create_opportunity` | same as CreateOpportunitySchema | Create opportunity |
| `update_opportunity` | `id` + UpdateOpportunitySchema | Update opportunity |

---

## 5. Concrete Code Examples

### Middleware: authenticateApiKey
```typescript
// src/api/middleware/authenticateApiKey.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = (req.headers['x-api-key'] as string) ||
                   (req.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');

    if (!apiKey) {
      return res.status(401).json(ApiResponse.error('MISSING_API_KEY', 'API key is required'));
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: credential, error } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !credential) {
      return res.status(401).json(ApiResponse.error('INVALID_API_KEY', 'Invalid or expired API key'));
    }

    if (new Date(credential.expires_at) < new Date()) {
      return res.status(401).json(ApiResponse.error('EXPIRED_API_KEY', 'API key has expired'));
    }

    // IP allowlist
    const clientIp = req.ip || req.connection.remoteAddress;
    if (credential.allowed_ips?.length && !credential.allowed_ips.includes(clientIp)) {
      return res.status(403).json(ApiResponse.error('IP_NOT_ALLOWED', 'IP not allowed for this credential'));
    }

    // Update last_used_at asynchronously
    supabase.from('api_credentials').update({ last_used_at: new Date().toISOString() }).eq('id', credential.id);

    req.apiCredential = credential;
    next();
  } catch (error) {
    return res.status(500).json(ApiResponse.error('AUTH_ERROR', 'Authentication service unavailable'));
  }
}
```

### Service Layer
```typescript
// src/services/externalApiService.ts
import { leadService } from './leadService';
import { opportunityService } from './opportunityService';
import { CreateLeadSchema, UpdateLeadSchema, CreateOpportunitySchema, UpdateOpportunitySchema } from '../api/schemas';
import { v4 as uuidv4 } from 'uuid';

export class ExternalApiService {
  async createLead(input: unknown, credential: ApiCredential): Promise<Lead> {
    const parsed = CreateLeadSchema.parse(input);

    if (!credential.scopes.includes('leads:write')) {
      throw new ApiError('FORBIDDEN', 'Missing scope: leads:write');
    }

    if (credential.company_settings_id) {
      parsed.company_settings_id = credential.company_settings_id;
    }

    const lead = await leadService.createLead(parsed);
    await this.audit('lead.create', lead.id, credential, parsed, undefined, 'success');
    return lead;
  }

  async updateLead(id: string, input: unknown, credential: ApiCredential): Promise<Lead> {
    const parsed = UpdateLeadSchema.parse({ id, ...input });

    if (!credential.scopes.includes('leads:write')) {
      throw new ApiError('FORBIDDEN', 'Missing scope: leads:write');
    }

    const lead = await leadService.updateLead(id, parsed);
    await this.audit('lead.update', lead.id, credential, undefined, parsed, 'success');
    return lead;
  }

  async createOpportunity(input: unknown, credential: ApiCredential): Promise<Opportunity> {
    const parsed = CreateOpportunitySchema.parse(input);

    if (!credential.scopes.includes('opportunities:write')) {
      throw new ApiError('FORBIDDEN', 'Missing scope: opportunities:write');
    }

    if (credential.company_settings_id) {
      parsed.company_settings_id = credential.company_settings_id;
    }

    const opportunity = await opportunityService.createOpportunity(parsed);
    await this.audit('opportunity.create', opportunity.id, credential, parsed, undefined, 'success');
    return opportunity;
  }

  async updateOpportunity(id: string, input: unknown, credential: ApiCredential): Promise<Opportunity> {
    const parsed = UpdateOpportunitySchema.parse({ id, ...input });

    if (!credential.scopes.includes('opportunities:write')) {
      throw new ApiError('FORBIDDEN', 'Missing scope: opportunities:write');
    }

    const opportunity = await opportunityService.updateOpportunity(id, parsed);
    await this.audit('opportunity.update', opportunity.id, credential, undefined, parsed, 'success');
    return opportunity;
  }

  private async audit(action: string, resourceId: string, credential: ApiCredential, payload?: unknown, changes?: unknown, status = 'success', errorMessage?: string) {
    const requestId = uuidv4();
    await supabase.from('audit_logs').insert({
      action,
      resource_type: action.split('.')[0],
      resource_id: resourceId,
      api_credential_id: credential.id,
      request_id: requestId,
      payload,
      changes,
      status,
      error_message: errorMessage,
    });
  }
}
```

### MCP Server
```typescript
// src/api/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { externalApiService } from '../../services/externalApiService';

const mcpServer = new Server({ name: 'kdadks-crm', version: '1.0.0' }, { capabilities: { tools: {} } });

const tools = [
  { name: 'create_lead', description: '...', inputSchema: CreateLeadSchema },
  { name: 'update_lead', description: '...', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'create_opportunity', description: '...', inputSchema: CreateOpportunitySchema },
  { name: 'update_opportunity', description: '...', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const credential = (request.params as any)._credential;
  if (!credential) throw new Error('Unauthorized');

  try {
    switch (request.params.name) {
      case 'create_lead': return { content: [{ type: 'text', text: JSON.stringify(await externalApiService.createLead(request.params.arguments, credential)) }] };
      case 'update_lead': return { content: [{ type: 'text', text: JSON.stringify(await externalApiService.updateLead(request.params.arguments.id, request.params.arguments, credential)) }] };
      case 'create_opportunity': return { content: [{ type: 'text', text: JSON.stringify(await externalApiService.createOpportunity(request.params.arguments, credential)) }] };
      case 'update_opportunity': return { content: [{ type: 'text', text: JSON.stringify(await externalApiService.updateOpportunity(request.params.arguments.id, request.params.arguments, credential)) }] };
      default: throw new Error('Unknown tool');
    }
  } catch (error) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: true, message: error.message }) }], isError: true };
  }
});

// SSE transport endpoint
export function mcpHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const transport = new SSEServerTransport('/api/v1/mcp', res);
  mcpServer.connect(transport);
}
```

---

## 6. External Infrastructure Setup (Required)

### A. Supabase Configuration
1. **Enable Auth Provider**: In Supabase Dashboard → Authentication → Providers → enable **Email** and **OAuth2**
   - For internal admin users generating API keys
   - Configure SMTP for email magic links (Brevo already in use)
2. **Create OAuth2 App** (for enterprise client credentials):
   - Supabase Dashboard → Authentication → OAuth Apps → New App
   - Set Grant type: `client_credentials`
   - Allowed scopes: map to API scopes above
   - Redirect URIs: `https://api.kdadks.com/api/v1/auth/callback`
3. **Supabase Vault**: Store `BREVO_PASSWORD`, reCAPTCHA secrets, and any third-party API keys
   - Enable Vault in Supabase Dashboard → Database → Vault
4. **Database Migrations**: Run the SQL above via Supabase Dashboard → SQL Editor or CLI
5. **Row Level Security**: Enable RLS on `api_credentials` and `audit_logs`
   - Only service role can read/write these tables
6. **Pitfalls**: If using Supabase Auth JWT, ensure `supabase.auth.getClaims()` is used in token validation middleware

### B. DNS & TLS
1. **Domain**: `api.kdadks.com` pointing to hosting (Netlify/Vercel/Railway)
2. **TLS**: Auto via hosting provider; enforce HSTS
3. **CORS Origins**: Configure exact origins; no wildcards in production
4. **IP Allowlisting**: Optional Cloudflare WAF or hosting-level firewall

### C. Redis (Rate Limiting & Queue)
- **Option A (managed)**: Upstash Redis or Redis Cloud
- **Option B (self-hosted)**: Single-node Redis on same VPS as API
- Connection string in env: `REDIS_URL=redis://default:password@host:6379`

### D. CI/CD & Secrets
1. **Environment Variables** (never commit):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `REDIS_URL`
   - `JWT_SECRET` (if minting custom JWTs)
   - `BREVO_PASSWORD`
2. **GitHub Actions / CI**: Store secrets in repo Settings → Secrets
3. **Pre-commit Hook**: `husky` + `lint-staged` to block committed secrets

---

## 7. Security Hardening (Enterprise)

### Headers (Helmet.js)
```typescript
app.use(helmet({
  contentSecurityPolicy: false, // adjust for your frontend needs
  crossOriginEmbedderPolicy: false,
}));
```

### Input Security
- Zod strict mode: `.strict()` rejects unknown fields
- SQL injection: Already prevented via Supabase parameterized queries
- XSS: Escape all dynamic content in responses; set `Content-Type: application/json`
- SSRF: No outbound requests from API except to Supabase/Redis

### Credential Management
- API keys generated: `crypto.randomBytes(32).toString('hex')` prefixed `kd_live_`
- Stored as SHA-256 only; raw key shown once at creation
- Keys rotated via new key + grace period + old key revocation
- Revocation: immediate `is_active = false` + Redis cache flush

### Monitoring & Alerting
- Log all auth failures to audit table
- Alert on >5 failed auths per minute per IP
- Alert on key usage outside allowed IPs
- Alert on rate limit violations (>80% of limit)

---

## 8. Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead not found",
    "details": { "id": ["Invalid UUID format"] },
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

### HTTP Status Codes
- 400: Validation error
- 401: Missing/invalid/expired API key
- 403: Scope/IP not allowed
- 404: Resource not found
- 429: Rate limit exceeded
- 500: Server error

### Async Error Boundaries
- Route errors → centralized error handler
- Unhandled rejections → process exit with alert
- Timeouts: 30s DB, 10s external

---

## 9. Testing Strategy

### Unit Tests
- Zod schemas: valid/invalid payloads
- Auth middleware: valid/invalid/expired keys, IP allowlist
- Service layer: create/update success and failures
- MCP tool handlers: parameter mapping and errors

### Integration Tests
- Full REST flow with test API key
- MCP server via stdio transport
- Rate limiter behavior under burst

### Security Tests
- Attempt SQL injection via all string fields
- Attempt XSS via description fields
- Attempt scope escalation
- Attempt access with revoked key
- Test IP allowlist enforcement

---

## 10. Deployment & Rollout

### Step-by-Step
1. Run Supabase migrations for `api_credentials` and `audit_logs`
2. Configure Supabase Auth + OAuth2 app
3. Enable Supabase Vault and migrate secrets
4. Deploy API code with Redis connection
5. Create first API key via admin endpoint or Supabase SQL
6. Test REST endpoints with curl/Postman
7. Test MCP server with local stdio client
8. Configure CORS, rate limits, WAF rules
9. Enable monitoring and alerts
10. Document API keys in internal wiki (not in repo)

### Rollback
- Feature flag for external API routes
- Can disable MCP endpoint independently
- Database changes are additive (no breaking changes to existing tables)

---

## 11. Out of Scope (Included for Awareness)
- GraphQL layer: REST + MCP is sufficient
- Frontend API key management UI: use Supabase Dashboard or direct SQL for now
- WebSocket real-time updates: future phase
- Multi-factor authentication for API keys: future enhancement

---

## 12. Files to Create/Modify

```
src/api/
  routes/external.ts           # REST routes
  middleware/authenticateApiKey.ts
  middleware/rateLimiter.ts
  middleware/validateRequest.ts
  middleware/auditLog.ts
  mcp/server.ts                # MCP server + SSE
  mcp/tools/leadTools.ts
  mcp/tools/opportunityTools.ts
  schemas/lead.ts
  schemas/opportunity.ts
  schemas/response.ts
src/services/externalApiService.ts
supabase/migrations/YYYYMMDD_create_api_credentials.sql
supabase/migrations/YYYYMMDD_create_audit_logs.sql
```
