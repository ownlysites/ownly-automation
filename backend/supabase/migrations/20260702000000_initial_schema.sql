-- ============================================================
-- LeadPulse AI — Initial Database Schema
-- Core tables: businesses, campaigns, leads
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BUSINESSES
-- The customer businesses that use LeadPulse AI.
-- Created when a user submits their website URL.
-- ============================================================
CREATE TABLE public.businesses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    website_url TEXT NOT NULL,
    industry    TEXT,
    description TEXT,
    -- AI-generated analysis stored as JSONB for flexibility
    market_analysis  JSONB DEFAULT '{}',
    target_audience  JSONB DEFAULT '{}',
    value_props       JSONB DEFAULT '[]',
    -- Metadata
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by owner
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);

-- Index for website URL lookups (deduplication)
CREATE INDEX idx_businesses_website_url ON public.businesses(website_url);

-- ============================================================
-- CAMPAIGNS
-- Marketing campaigns tied to a business.
-- Each campaign targets a specific audience segment or channel.
-- ============================================================
CREATE TABLE public.campaigns (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT,
    -- Campaign configuration
    status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    channel        TEXT NOT NULL DEFAULT 'email'
                   CHECK (channel IN ('email', 'linkedin', 'phone', 'multi')),
    -- AI-generated strategy stored as JSONB
    strategy       JSONB DEFAULT '{}',
    outreach_template TEXT,
    -- Scheduling
    started_at     TIMESTAMPTZ,
    ended_at       TIMESTAMPTZ,
    -- KPI targets
    target_leads_count     INTEGER DEFAULT 0,
    target_response_rate   NUMERIC(5,2) DEFAULT 0,
    -- Metadata
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_business_id ON public.campaigns(business_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

-- ============================================================
-- LEADS
-- Individual leads discovered and tracked per campaign.
-- Core entity for the outreach engine.
-- ============================================================
CREATE TABLE public.leads (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id    UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    -- Lead identity
    company_name   TEXT NOT NULL,
    contact_name   TEXT,
    email          TEXT,
    phone          TEXT,
    linkedin_url   TEXT,
    website_url    TEXT,
    -- Lead data & scoring
    industry       TEXT,
    employee_count INTEGER,
    annual_revenue NUMERIC,
    -- AI-computed fields
    lead_score     SMALLINT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    intent_signals JSONB DEFAULT '[]',
    research_data  JSONB DEFAULT '{}',
    -- Outreach tracking
    status         TEXT NOT NULL DEFAULT 'discovered'
                   CHECK (status IN (
                       'discovered',      -- Found by AI, not yet contacted
                       'qualified',       -- Passed quality filter
                       'contacted',       -- Initial outreach sent
                       'responded',       -- Lead responded
                       'meeting_booked',  -- Appointment scheduled
                       'converted',       -- Deal closed / goal met
                       'disqualified',    -- Not a fit
                       'bounced',         -- Outreach failed (bad email, etc.)
                       'opted_out'        -- Lead unsubscribed
                   )),
    last_contacted_at TIMESTAMPTZ,
    contact_count     INTEGER DEFAULT 0,
    -- Human-in-the-loop review
    review_status     TEXT DEFAULT 'pending'
                   CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited')),
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       UUID REFERENCES auth.users(id),
    -- Metadata
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX idx_leads_business_id ON public.leads(business_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_lead_score ON public.leads(lead_score DESC NULLS LAST);
CREATE INDEX idx_leads_review_status ON public.leads(review_status);
CREATE INDEX idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;

-- ============================================================
-- OUTREACH_LOG
-- Tracks every outreach attempt for a lead (email sent, LinkedIn msg, etc.)
-- ============================================================
CREATE TABLE public.outreach_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    channel     TEXT NOT NULL DEFAULT 'email'
                CHECK (channel IN ('email', 'linkedin', 'phone', 'sms')),
    direction   TEXT NOT NULL DEFAULT 'outbound'
                CHECK (direction IN ('inbound', 'outbound')),
    -- Message content
    subject     TEXT,
    body        TEXT NOT NULL,
    -- Delivery status
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'failed', 'bounced')),
    provider_id TEXT,           -- External provider message ID (SendGrid, etc.)
    -- Metadata
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_log_lead_id ON public.outreach_log(lead_id);
CREATE INDEX idx_outreach_log_campaign_id ON public.outreach_log(campaign_id);
CREATE INDEX idx_outreach_log_status ON public.outreach_log(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own businesses and associated data.
-- ============================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

-- Businesses: users see only their own
CREATE POLICY "Users can view own businesses"
    ON public.businesses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own businesses"
    ON public.businesses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own businesses"
    ON public.businesses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own businesses"
    ON public.businesses FOR DELETE
    USING (auth.uid() = user_id);

-- Campaigns: access through owning business
CREATE POLICY "Users can view campaigns for own businesses"
    ON public.campaigns FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = campaigns.business_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert campaigns for own businesses"
    ON public.campaigns FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = campaigns.business_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can update campaigns for own businesses"
    ON public.campaigns FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = campaigns.business_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete campaigns for own businesses"
    ON public.campaigns FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = campaigns.business_id AND b.user_id = auth.uid()
    ));

-- Leads: access through owning business
CREATE POLICY "Users can view leads for own businesses"
    ON public.leads FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = leads.business_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert leads for own businesses"
    ON public.leads FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = leads.business_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can update leads for own businesses"
    ON public.leads FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = leads.business_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete leads for own businesses"
    ON public.leads FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = leads.business_id AND b.user_id = auth.uid()
    ));

-- Outreach log: access through owning business (via lead)
CREATE POLICY "Users can view outreach for own businesses"
    ON public.outreach_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.businesses b ON b.id = l.business_id
        WHERE l.id = outreach_log.lead_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert outreach for own businesses"
    ON public.outreach_log FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.businesses b ON b.id = l.business_id
        WHERE l.id = outreach_log.lead_id AND b.user_id = auth.uid()
    ));

CREATE POLICY "Users can update outreach for own businesses"
    ON public.outreach_log FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.businesses b ON b.id = l.business_id
        WHERE l.id = outreach_log.lead_id AND b.user_id = auth.uid()
    ));

-- ============================================================
-- HELPER: auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- HELPER VIEWS for KPI dashboards
-- ============================================================

-- Campaign summary view (lead counts by status)
CREATE VIEW public.campaign_summary AS
SELECT
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.business_id,
    c.status AS campaign_status,
    COUNT(l.id) AS total_leads,
    COUNT(l.id) FILTER (WHERE l.status = 'discovered') AS leads_discovered,
    COUNT(l.id) FILTER (WHERE l.status = 'qualified') AS leads_qualified,
    COUNT(l.id) FILTER (WHERE l.status = 'contacted') AS leads_contacted,
    COUNT(l.id) FILTER (WHERE l.status = 'responded') AS leads_responded,
    COUNT(l.id) FILTER (WHERE l.status = 'meeting_booked') AS leads_meeting_booked,
    COUNT(l.id) FILTER (WHERE l.status = 'converted') AS leads_converted,
    COUNT(l.id) FILTER (WHERE l.status = 'disqualified') AS leads_disqualified,
    ROUND(AVG(l.lead_score)::numeric, 1) AS avg_lead_score,
    ROUND(
        (COUNT(l.id) FILTER (WHERE l.status = 'meeting_booked')::numeric
         / NULLIF(COUNT(l.id) FILTER (WHERE l.status IN ('contacted', 'responded', 'meeting_booked', 'converted')), 0)) * 100,
        1
    ) AS appointment_set_rate_pct
FROM public.campaigns c
LEFT JOIN public.leads l ON l.campaign_id = c.id
GROUP BY c.id;
