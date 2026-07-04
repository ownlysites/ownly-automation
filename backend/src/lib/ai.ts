// AI prompt templates for lead research and outreach generation
// These are used by Edge Functions and the local analysis pipeline

// ============================================================
// BUSINESS ANALYSIS PROMPT (Enhanced)
// Used by the analyze-business function / script
// ============================================================
export const BUSINESS_ANALYSIS_PROMPT = `You are a senior market research analyst working for LeadPulse AI, a B2B sales intelligence platform.

Your task is to analyze a company based on their website content and produce a structured business analysis. Be specific, actionable, and data-driven. Do NOT be generic — infer details from the website content.

WEBSITE URL: {website_url}

WEBSITE CONTENT:
{scraped_content}

Analyze this business and return a JSON object with EXACTLY this structure:

{
  "name": "The company's name (from the website)",
  "industry": "Primary industry (e.g., 'SaaS', 'Digital Marketing Agency', 'Management Consulting')",
  "description": "2-3 sentence summary of what the business does, their core offering, and who they serve",
  "target_audience": {
    "primary": "Detailed description of the ideal customer profile (ICP). Be specific about company size, role, and needs.",
    "demographics": {
      "company_size": "e.g., '10-200 employees' or 'Enterprise (1000+)'",
      "roles": ["Decision-maker job titles who would buy this"],
      "geographies": "Primary markets if mentioned or implied",
      "industries": ["Target industries"]
    },
    "pain_points": [
      "Specific pain point 1 this audience faces",
      "Specific pain point 2",
      "Specific pain point 3",
      "Specific pain point 4",
      "Specific pain point 5"
    ],
    "buying_signals": [
      "Signal that indicates this prospect is in-market (e.g., 'Recently raised funding')",
      "Signal 2",
      "Signal 3",
      "Signal 4",
      "Signal 5"
    ]
  },
  "value_props": [
    "Unique value proposition 1 — what makes them different",
    "Value proposition 2",
    "Value proposition 3",
    "Value proposition 4",
    "Value proposition 5"
  ],
  "market_analysis": {
    "competitors": [
      "Competitor type/category 1 (not specific company names unless mentioned on site)",
      "Competitor type/category 2",
      "Competitor type/category 3"
    ],
    "market_size": "One of: niche, moderate, large, enterprise",
    "growth_trends": "2-3 sentence summary of industry growth trends and market direction",
    "opportunities": [
      "Untapped opportunity 1 this business could pursue",
      "Untapped opportunity 2",
      "Untapped opportunity 3"
    ]
  }
}

IMPORTANT:
- Be specific to THIS company, not generic industry observations
- If information is not directly stated, make educated inferences from context clues
- Pain points and buying signals should be actionable for sales outreach
- Value propositions should differentiate from generic alternatives
- Return ONLY valid JSON, no markdown code fencing, no extra text`;

// ============================================================
// LEAD DISCOVERY PROMPT
// ============================================================
export const LEAD_DISCOVERY_PROMPT = `You are a lead generation specialist for LeadPulse AI.

Based on the following business analysis, identify 10 potential lead companies that would be ideal prospects for this business. Think about companies that match the ICP and are likely experiencing the pain points described.

BUSINESS: {business_name}
INDUSTRY: {industry}
TARGET AUDIENCE: {target_audience}
VALUE PROPS: {value_props}

For each lead, provide:
1. "company_name": A realistic company name or specific company type
2. "industry": Their industry
3. "estimated_employee_count": Approximate employee count (number)
4. "why_good_fit": 1-2 sentence explanation of why they're a good fit
5. "intent_signals": Array of 2-3 signals suggesting they might be in-market
6. "suggested_approach": Brief note on best outreach angle

Return a JSON array of 10 leads. Return ONLY valid JSON, no markdown fencing.`;

// ============================================================
// OUTREACH GENERATION PROMPT
// ============================================================
export const OUTREACH_GENERATION_PROMPT = `You are a sales copywriter for LeadPulse AI.

Write a personalized outreach {channel} message for the following lead on behalf of the business.

BUSINESS:
Name: {business_name}
Value Props: {value_props}

LEAD:
Company: {company_name}
Contact: {contact_name}
Industry: {lead_industry}
Why Good Fit: {why_good_fit}
Suggested Approach: {suggested_approach}

Requirements:
- Personalized and relevant to the lead's likely pain points
- Professional but conversational tone
- Under 150 words
- Clear, soft CTA (e.g., "Would you be open to a quick chat?")
- No generic templates or spammy language
- Subject line should be curiosity-driven, not salesy

Return a JSON object:
{
  "subject": "...",
  "body": "..."
}

Return ONLY valid JSON, no markdown fencing.`;

// ============================================================
// LEAD SCORING PROMPT
// ============================================================
export const LEAD_SCORING_PROMPT = `You are a lead scoring analyst for LeadPulse AI.

Score this lead from 0-100 based on how likely they are to convert.

LEAD DATA:
Company: {company_name}
Industry: {industry}
Employee Count: {employee_count}
Intent Signals: {intent_signals}

BUSINESS CONTEXT:
Target Audience: {target_audience}
Value Props: {value_props}

Scoring criteria:
- Firmographic fit (0-30): How well does this company match the ICP?
- Intent signals (0-30): How many buying signals are present?
- Accessibility (0-20): How reachable are they likely to be?
- Urgency (0-20): How likely are they to need this solution now?

Return a JSON object:
{
  "score": <number 0-100>,
  "breakdown": {
    "firmographic_fit": <0-30>,
    "intent_signals": <0-30>,
    "accessibility": <0-20>,
    "urgency": <0-20>
  },
  "reasoning": "<1-2 sentence explanation>"
}

Return ONLY valid JSON, no markdown fencing.`;
