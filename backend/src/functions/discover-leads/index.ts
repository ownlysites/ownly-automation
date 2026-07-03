// Edge Function: discover-leads
// Discovers potential leads for a business based on its analysis
// Part of the LeadPulse AI pipeline (Step 2 after analyze-business)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../lib/cors.ts';
import { getSupabaseClient, getSupabaseAdminClient } from '../lib/supabase.ts';
import { LEAD_DISCOVERY_PROMPT, LEAD_SCORING_PROMPT } from '../lib/ai.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { business_id, campaign_id } = await req.json();

    if (!business_id || !campaign_id) {
      return new Response(
        JSON.stringify({ error: 'business_id and campaign_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch business data
    const supabase = getSupabaseClient(req);
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();

    if (bizError) throw bizError;

    // Step 2: Generate lead suggestions via AI
    const prompt = LEAD_DISCOVERY_PROMPT
      .replace('{business_name}', business.name)
      .replace('{industry}', business.industry || 'Unknown')
      .replace('{target_audience}', JSON.stringify(business.target_audience))
      .replace('{value_props}', JSON.stringify(business.value_props));

    const leadSuggestions = await callAI(prompt);

    // Step 3: Score each lead and insert into database
    const adminClient = getSupabaseAdminClient();
    const leads = [];

    for (const suggestion of leadSuggestions) {
      // Score the lead
      const scoringPrompt = LEAD_SCORING_PROMPT
        .replace('{company_name}', suggestion.company_name)
        .replace('{industry}', suggestion.industry || '')
        .replace('{employee_count}', String(suggestion.estimated_employee_count || ''))
        .replace('{intent_signals}', JSON.stringify(suggestion.intent_signals))
        .replace('{target_audience}', JSON.stringify(business.target_audience))
        .replace('{value_props}', JSON.stringify(business.value_props));

      const scoringResult = await callAI(scoringPrompt);

      const lead = {
        campaign_id,
        business_id,
        company_name: suggestion.company_name,
        industry: suggestion.industry,
        employee_count: suggestion.estimated_employee_count,
        lead_score: scoringResult.score || 0,
        intent_signals: suggestion.intent_signals,
        research_data: {
          why_good_fit: suggestion.why_good_fit,
          suggested_approach: suggestion.suggested_approach,
          scoring_breakdown: scoringResult.breakdown,
          scoring_reasoning: scoringResult.reasoning,
        },
        status: 'discovered',
        review_status: 'pending',
      };

      const { data, error } = await adminClient
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (!error && data) leads.push(data);
    }

    return new Response(
      JSON.stringify({ success: true, leads_discovered: leads.length, leads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callAI(prompt: string): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a lead generation AI. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned no content');

  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error('AI returned invalid JSON');
  }
}
