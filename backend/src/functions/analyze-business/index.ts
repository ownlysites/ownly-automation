// Edge Function: analyze-business
// Takes a website URL, scrapes the site, and generates a business analysis using AI
// This is the entry point for the LeadPulse AI pipeline (Supabase Edge Function version)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../lib/cors.ts';
import { getSupabaseClient, getSupabaseAdminClient } from '../lib/supabase.ts';
import { BUSINESS_ANALYSIS_PROMPT } from '../lib/ai.ts';

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { website_url, business_id, user_id } = await req.json();

    if (!website_url) {
      return new Response(
        JSON.stringify({ error: 'website_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape website content
    const scrapedContent = await scrapeWebsite(website_url);

    if (!scrapedContent || scrapedContent.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Could not scrape enough content from the website', scraped: scrapedContent?.slice(0, 200) }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Generate AI analysis
    const prompt = BUSINESS_ANALYSIS_PROMPT
      .replace('{website_url}', website_url)
      .replace('{scraped_content}', scrapedContent);

    const analysis = await callOpenAI(prompt, openaiApiKey);

    // Step 3: Save/update business record
    const adminClient = getSupabaseAdminClient();

    if (business_id) {
      // Update existing business
      const { error } = await adminClient
        .from('businesses')
        .update({
          name: analysis.name,
          industry: analysis.industry,
          description: analysis.description,
          target_audience: analysis.target_audience,
          value_props: analysis.value_props,
          market_analysis: analysis.market_analysis,
        })
        .eq('id', business_id);

      if (error) throw error;
    } else if (user_id) {
      // Create new business
      const { data, error } = await adminClient
        .from('businesses')
        .insert({
          user_id,
          name: analysis.name,
          website_url,
          industry: analysis.industry,
          description: analysis.description,
          target_audience: analysis.target_audience,
          value_props: analysis.value_props,
          market_analysis: analysis.market_analysis,
        })
        .select()
        .single();

      if (error) throw error;
      business_id === data?.id; // Return the new ID
    }

    return new Response(
      JSON.stringify({ success: true, analysis, business_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================
// Web Scraper (Deno-compatible — uses Deno's native fetch)
// ============================================================
async function scrapeWebsite(url: string): Promise<string> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  // Scrape homepage
  const homepageContent = await scrapePage(normalizedUrl);

  // Find key subpages from the homepage
  const subpageUrls = findSubpageUrls(homepageContent, normalizedUrl);

  // Scrape up to 3 subpages
  const subpageContents = await Promise.all(
    subpageUrls.slice(0, 3).map(u => scrapePage(u))
  );

  // Combine content
  const allContent = [homepageContent.text];
  for (const page of subpageContents) {
    if (page.text && page.text.length > 50) {
      allContent.push(`\n--- ${page.title} ---\n${page.text}`);
    }
  }

  return allContent.join('\n').slice(0, 30000);
}

async function scrapePage(url: string): Promise<{ title: string; text: string; html: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadPulseAI/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return { title: '', text: '', html: '' };

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Remove scripts, styles, nav, etc.
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return { title, text, html };
  } catch {
    return { title: '', text: '', html: '' };
  }
}

function findSubpageUrls(page: { html: string }, baseUrl: string): string[] {
  const patterns = [/about/i, /services/i, /products/i, /solutions/i, /features/i];
  const links: string[] = [];

  try {
    const urlObj = new URL(baseUrl);
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;

    while ((match = hrefRegex.exec(page.html)) !== null) {
      const href = match[1];
      if (patterns.some(p => p.test(href))) {
        try {
          const resolved = new URL(href, baseUrl);
          if (resolved.hostname === urlObj.hostname) {
            links.push(resolved.href);
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }

  return [...new Set(links)];
}

// ============================================================
// OpenAI Client (Deno-compatible)
// ============================================================
async function callOpenAI(prompt: string, apiKey: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a business analysis AI. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('AI returned no content');

  // Parse JSON response
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);

    // Try to find JSON object in text
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);

    throw new Error('AI returned invalid JSON');
  }
}
