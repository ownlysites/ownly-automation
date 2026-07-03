// LeadPulse AI — Database Type Definitions
// Auto-generated style types for Supabase tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================
// BUSINESSES
// ============================================================
export type BusinessStatus = 'active' | 'inactive';

export interface Business {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
  industry: string | null;
  description: string | null;
  market_analysis: Json;
  target_audience: Json;
  value_props: Json;
  created_at: string;
  updated_at: string;
}

export interface BusinessInsert {
  id?: string;
  user_id: string;
  name: string;
  website_url: string;
  industry?: string | null;
  description?: string | null;
  market_analysis?: Json;
  target_audience?: Json;
  value_props?: Json;
}

export interface BusinessUpdate {
  name?: string;
  website_url?: string;
  industry?: string | null;
  description?: string | null;
  market_analysis?: Json;
  target_audience?: Json;
  value_props?: Json;
}

// ============================================================
// CAMPAIGNS
// ============================================================
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type CampaignChannel = 'email' | 'linkedin' | 'phone' | 'multi';

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  channel: CampaignChannel;
  strategy: Json;
  outreach_template: string | null;
  started_at: string | null;
  ended_at: string | null;
  target_leads_count: number;
  target_response_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignInsert {
  id?: string;
  business_id: string;
  name: string;
  description?: string | null;
  status?: CampaignStatus;
  channel?: CampaignChannel;
  strategy?: Json;
  outreach_template?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  target_leads_count?: number;
  target_response_rate?: number;
}

export interface CampaignUpdate {
  name?: string;
  description?: string | null;
  status?: CampaignStatus;
  channel?: CampaignChannel;
  strategy?: Json;
  outreach_template?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  target_leads_count?: number;
  target_response_rate?: number;
}

// ============================================================
// LEADS
// ============================================================
export type LeadStatus =
  | 'discovered'
  | 'qualified'
  | 'contacted'
  | 'responded'
  | 'meeting_booked'
  | 'converted'
  | 'disqualified'
  | 'bounced'
  | 'opted_out';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface Lead {
  id: string;
  campaign_id: string;
  business_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  industry: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  lead_score: number;
  intent_signals: Json;
  research_data: Json;
  status: LeadStatus;
  last_contacted_at: string | null;
  contact_count: number;
  review_status: ReviewStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  id?: string;
  campaign_id: string;
  business_id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  industry?: string | null;
  employee_count?: number | null;
  annual_revenue?: number | null;
  lead_score?: number;
  intent_signals?: Json;
  research_data?: Json;
  status?: LeadStatus;
  review_status?: ReviewStatus;
}

export interface LeadUpdate {
  company_name?: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  industry?: string | null;
  employee_count?: number | null;
  annual_revenue?: number | null;
  lead_score?: number;
  intent_signals?: Json;
  research_data?: Json;
  status?: LeadStatus;
  last_contacted_at?: string | null;
  contact_count?: number;
  review_status?: ReviewStatus;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

// ============================================================
// OUTREACH LOG
// ============================================================
export type OutreachChannel = 'email' | 'linkedin' | 'phone' | 'sms';
export type OutreachDirection = 'inbound' | 'outbound';
export type OutreachStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'failed' | 'bounced';

export interface OutreachLog {
  id: string;
  lead_id: string;
  campaign_id: string;
  channel: OutreachChannel;
  direction: OutreachDirection;
  subject: string | null;
  body: string;
  status: OutreachStatus;
  provider_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface OutreachLogInsert {
  id?: string;
  lead_id: string;
  campaign_id: string;
  channel?: OutreachChannel;
  direction?: OutreachDirection;
  subject?: string | null;
  body: string;
  status?: OutreachStatus;
  provider_id?: string | null;
  sent_at?: string | null;
}

// ============================================================
// CAMPAIGN SUMMARY (View)
// ============================================================
export interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  business_id: string;
  campaign_status: CampaignStatus;
  total_leads: number;
  leads_discovered: number;
  leads_qualified: number;
  leads_contacted: number;
  leads_responded: number;
  leads_meeting_booked: number;
  leads_converted: number;
  leads_disqualified: number;
  avg_lead_score: number | null;
  appointment_set_rate_pct: number | null;
}

// ============================================================
// DATABASE TYPE MAP (for Supabase client)
// ============================================================
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: BusinessInsert;
        Update: BusinessUpdate;
      };
      campaigns: {
        Row: Campaign;
        Insert: CampaignInsert;
        Update: CampaignUpdate;
      };
      leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: LeadUpdate;
      };
      outreach_log: {
        Row: OutreachLog;
        Insert: OutreachLogInsert;
        Update: Partial<OutreachLogInsert>;
      };
    };
    Views: {
      campaign_summary: {
        Row: CampaignSummary;
      };
    };
  };
}
