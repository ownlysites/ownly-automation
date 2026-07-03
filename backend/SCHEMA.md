# LeadPulse AI — Database Schema Documentation

## Overview

The LeadPulse AI database uses **4 core tables** and **1 summary view** to power the automated sales pipeline.

### Entity Relationship

```
auth.users (Supabase Auth)
    └── businesses (1:user → N:businesses)
            └── campaigns (1:business → N:campaigns)
                    └── leads (1:campaign → N:leads)
                            └── outreach_log (1:lead → N:outreach_log)
```

---

## Tables

### `businesses`
The customer businesses using LeadPulse AI. Created when a user submits their website URL.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → auth.users (owner) |
| `name` | TEXT | Business name |
| `website_url` | TEXT | Submitted website URL |
| `industry` | TEXT | AI-detected industry |
| `description` | TEXT | AI-generated business summary |
| `market_analysis` | JSONB | Competitors, market size, trends, opportunities |
| `target_audience` | JSONB | ICP: demographics, pain points, buying signals |
| `value_props` | JSONB | Array of unique value propositions |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

### `campaigns`
Marketing campaigns created for each business.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `business_id` | UUID | FK → businesses |
| `name` | TEXT | Campaign name |
| `description` | TEXT | Campaign description |
| `status` | TEXT | `draft` / `active` / `paused` / `completed` / `archived` |
| `channel` | TEXT | `email` / `linkedin` / `phone` / `multi` |
| `strategy` | JSONB | AI-generated campaign strategy |
| `outreach_template` | TEXT | Base outreach template |
| `started_at` | TIMESTAMPTZ | When campaign went live |
| `ended_at` | TIMESTAMPTZ | When campaign ended |
| `target_leads_count` | INTEGER | Lead volume goal |
| `target_response_rate` | NUMERIC(5,2) | Response rate goal |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

### `leads`
Individual leads discovered and tracked per campaign. The core entity for the outreach engine.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID | FK → campaigns |
| `business_id` | UUID | FK → businesses (denormalized for RLS) |
| `company_name` | TEXT | Lead company name |
| `contact_name` | TEXT | Contact person |
| `email` | TEXT | Contact email |
| `phone` | TEXT | Contact phone |
| `linkedin_url` | TEXT | LinkedIn profile |
| `website_url` | TEXT | Company website |
| `industry` | TEXT | Lead's industry |
| `employee_count` | INTEGER | Company size |
| `annual_revenue` | NUMERIC | Company revenue |
| `lead_score` | SMALLINT (0–100) | AI-computed quality score |
| `intent_signals` | JSONB | Array of buying intent signals |
| `research_data` | JSONB | AI research notes & scoring breakdown |
| `status` | TEXT | Lead pipeline status (see below) |
| `last_contacted_at` | TIMESTAMPTZ | Last outreach timestamp |
| `contact_count` | INTEGER | Number of outreach attempts |
| `review_status` | TEXT | Human review: `pending` / `approved` / `rejected` / `edited` |
| `reviewed_at` | TIMESTAMPTZ | When reviewed |
| `reviewed_by` | UUID | Who reviewed |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**Lead Status Pipeline:**
```
discovered → qualified → contacted → responded → meeting_booked → converted
                                         ↓
                                      bounced
                ↓
            disqualified
                                         ↓
                                      opted_out
```

### `outreach_log`
Tracks every outreach attempt for a lead.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lead_id` | UUID | FK → leads |
| `campaign_id` | UUID | FK → campaigns |
| `channel` | TEXT | `email` / `linkedin` / `phone` / `sms` |
| `direction` | TEXT | `inbound` / `outbound` |
| `subject` | TEXT | Email subject line |
| `body` | TEXT | Message body |
| `status` | TEXT | `pending` / `sent` / `delivered` / `opened` / `replied` / `failed` / `bounced` |
| `provider_id` | TEXT | External message ID (SendGrid, etc.) |
| `sent_at` | TIMESTAMPTZ | When sent |
| `created_at` | TIMESTAMPTZ | Auto-set |

---

## View: `campaign_summary`
Aggregated KPI view for dashboards.

| Column | Type | Description |
|--------|------|-------------|
| `campaign_id` | UUID | Campaign ID |
| `campaign_name` | TEXT | Campaign name |
| `business_id` | UUID | Owning business |
| `campaign_status` | TEXT | Campaign status |
| `total_leads` | BIGINT | Total lead count |
| `leads_discovered` | BIGINT | Leads in discovered status |
| `leads_qualified` | BIGINT | Leads in qualified status |
| `leads_contacted` | BIGINT | Leads in contacted status |
| `leads_responded` | BIGINT | Leads in responded status |
| `leads_meeting_booked` | BIGINT | Leads in meeting_booked status |
| `leads_converted` | BIGINT | Leads in converted status |
| `leads_disqualified` | BIGINT | Leads in disqualified status |
| `avg_lead_score` | NUMERIC | Average lead score |
| `appointment_set_rate_pct` | NUMERIC | Meeting booked / contacted rate |

---

## Security (RLS)

All tables have Row Level Security enabled. Users can only access data for businesses they own. The `business_id` is denormalized onto `leads` to make RLS policies efficient (avoids multi-table joins).

## Triggers

- `handle_updated_at()` — Auto-updates `updated_at` on every row update for businesses, campaigns, and leads.
