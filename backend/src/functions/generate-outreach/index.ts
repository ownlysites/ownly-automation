// Edge Function: generate-outreach
// Generates personalized outreach messages for approved leads
// Part of the LeadPulse AI pipeline (Step 3 after lead review)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../lib/cors.ts';
import { getSupabaseClient, getSupabaseAdminClient } from '../lib/supabase.ts';
import { OUTREACH_GENERATION_PROMPT, LEADPULSE_EMAIL } from '../lib/ai.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { lead_id, channel } = await req.json();

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient(req);
    const adminClient = getSupabaseAdminClient();

    // Step 1: Fetch lead with business context
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, businesses(*)')
      .eq('id', lead_id)
      .single();

    if (leadError) throw leadError;

    const business = lead.businesses;
    const outreachChannel = channel || 'email';

    // Step 2: Generate outreach message
    const prompt = OUTREACH_GENERATION_PROMPT
      .replace('{channel}', outreachChannel)
      .replace('{business_name}', business.name)
      .replace('{value_props}', JSON.stringify(business.value_props))
      .replace('{company_name}', lead.company_name)
      .replace('{contact_name}', lead.contact_name || 'there')
      .replace('{lead_industry}', lead.industry || '')
      .replace('{why_good_fit}', lead.research_data?.why_good_fit || '')
      .replace('{suggested_approach}', lead.research_data?.suggested_approach || '');

    const message = await callAI(prompt);

    // Step 3: Insert outreach log
    const { data: log, error: logError } = await adminClient
      .from('outreach_log')
      .insert({
        lead_id: lead.id,
        campaign_id: lead.campaign_id,
        channel: outreachChannel,
        direction: 'outbound',
        subject: message.subject || null,
        body: message.body,
        status: 'pending',
      })
      .select()
      .single();

    if (logError) throw logError;

    // Step 4: Update lead status
    await adminClient
      .from('leads')
      .update({
        status: 'contacted',
        last_contacted_at: new Date().toISOString(),
        contact_count: lead.contact_count + 1,
      })
      .eq('id', lead_id);

    return new Response(
      JSON.stringify({ success: true, message, log }),
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
        { role: 'system', content: 'You are a sales copywriter AI. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
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
