// Edge Function: analyze-business
// Takes a website URL, scrapes the site, and generates a business analysis using AI
// This is the entry point for the LeadPulse AI pipeline

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../lib/cors.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import { BUSINESS_ANALYSIS_PROMPT } from '../lib/ai.ts';

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { website_url, business_id } = await req.json();

    if (!website_url) {
      return new Response(
        JSON.stringify({ error: 'website_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape website content (placeholder — will use scraping service)
    const scrapedContent = await scrapeWebsite(website_url);

    // Step 2: Generate AI analysis
    const prompt = BUSINESS_ANALYSIS_PROMPT
      .replace('{website_url}', website_url)
      .replace('{scraped_content}', scrapedContent);

    const analysis = await callAI(prompt);

    // Step 3: Update business record with analysis
    const supabase = getSupabaseClient(req);
    if (business_id) {
      const { error } = await supabase
        .from('businesses')
        .update({
          industry: analysis.industry,
          description: analysis.description,
          target_audience: analysis.target_audience,
          value_props: analysis.value_props,
          market_analysis: analysis.market_analysis,
        })
        .eq('id', business_id);

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scrapeWebsite(url: string): Promise<string> {
  // Placeholder — will integrate with web scraping service
  // Could use: Firecrawl, ScrapingBee, or custom fetch+parse
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LeadPulse-AI/1.0' },
    });
    return await response.text();
  } catch {
    return 'Unable to scrape website content';
  }
}

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
        { role: 'system', content: 'You are a business analysis AI. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('AI returned no content');

  // Parse the JSON response
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown fencing
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error('AI returned invalid JSON');
  }
}
