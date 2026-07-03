// AI prompt templates for lead research and outreach generation
// These are used by Edge Functions to generate content via OpenAI/Gemini

export const BUSINESS_ANALYSIS_PROMPT = `
You are a market research analyst for LeadPulse AI.

Given the following business website URL and any scraped content, analyze the business and return a JSON object with:

1. "industry": The primary industry this business operates in
2. "description": A 2-3 sentence summary of what the business does
3. "target_audience": An object with:
   - "primary": Description of the ideal customer profile
   - "demographics": Key demographic traits
   - "pain_points": Array of 3-5 pain points this audience faces
   - "buying_signals": Array of 3-5 signals that indicate purchase intent
4. "value_props": Array of 3-5 unique value propositions this business offers
5. "market_analysis": An object with:
   - "competitors": Array of 3-5 likely competitor types (not specific names)
   - "market_size": Estimated market size category (niche/moderate/large)
   - "growth_trends": 2-3 sentence summary of growth trends
   - "opportunities": Array of 2-3 untapped opportunities

Website URL: {website_url}
Scraped content: {scraped_content}

Return ONLY valid JSON, no markdown fencing.
`;

export const LEAD_DISCOVERY_PROMPT = `
You are a lead generation specialist for LeadPulse AI.

Based on the following business analysis, identify potential lead companies that would be ideal prospects.

Business: {business_name}
Industry: {industry}
Target Audience: {target_audience}
Value Props: {value_props}

For each lead, provide:
1. "company_name": Likely company name or type
2. "industry": Their industry
3. "estimated_employee_count": Approximate size
4. "why_good_fit": 1-2 sentence explanation of why they're a good fit
5. "intent_signals": Array of 2-3 signals suggesting they might be in-market
6. "suggested_approach": Brief note on best outreach angle

Return a JSON array of 10 leads. Return ONLY valid JSON, no markdown fencing.
`;

export const OUTREACH_GENERATION_PROMPT = `
You are a sales copywriter for LeadPulse AI.

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

Return ONLY valid JSON, no markdown fencing.
`;

export const LEAD_SCORING_PROMPT = `
You are a lead scoring analyst for LeadPulse AI.

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

Return ONLY valid JSON, no markdown fencing.
`;
