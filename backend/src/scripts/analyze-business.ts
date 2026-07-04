#!/usr/bin/env node
// LeadPulse AI — Business Analysis Pipeline
// Standalone script for testing the analyze-business pipeline
// Usage: node --import tsx backend/src/scripts/analyze-business.ts <url>
// Or:    bun run backend/src/scripts/analyze-business.ts <url>
//
// This script:
// 1. Scrapes the website URL using fetch + cheerio
// 2. Sends the content to OpenAI for business analysis
// 3. Saves the result to team-db (SQLite)
// 4. Outputs the analysis to stdout and a JSON file

import { scrapeWebsiteDeep, formatScrapedContentForPrompt } from '../lib/scraper.js';
import { BUSINESS_ANALYSIS_PROMPT } from '../lib/ai.js';
import { callOpenAIWithRetry } from '../lib/openai.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ============================================================
// Types matching our database schema
// ============================================================
interface BusinessAnalysis {
  name: string;
  industry: string;
  description: string;
  target_audience: {
    primary: string;
    demographics: {
      company_size: string;
      roles: string[];
      geographies: string;
      industries: string[];
    };
    pain_points: string[];
    buying_signals: string[];
  };
  value_props: string[];
  market_analysis: {
    competitors: string[];
    market_size: string;
    growth_trends: string;
    opportunities: string[];
  };
}

interface BusinessRecord {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
  industry: string | null;
  description: string | null;
  market_analysis: any;
  target_audience: any;
  value_props: any;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Pipeline
// ============================================================

async function main() {
  const url = process.argv[2];
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!url) {
    console.error('❌ Usage: analyze-business.ts <website_url>');
    console.error('   Example: analyze-business.ts https://cto.new');
    process.exit(1);
  }

  console.log(`\n🚀 LeadPulse AI — Business Analysis Pipeline`);
  console.log(`==========================================`);
  console.log(`URL: ${url}\n`);

  // Step 1: Scrape website
  console.log('📡 Step 1: Scraping website...');
  const scraped = await scrapeWebsiteDeep(url, 3);
  console.log(`   ✓ Title: ${scraped.title}`);
  console.log(`   ✓ Body text: ${scraped.bodyText.length} chars`);
  console.log(`   ✓ Headings: ${scraped.headings.length}`);
  console.log(`   ✓ Links found: ${scraped.links.length}`);

  if (!scraped.bodyText || scraped.bodyText.length < 50) {
    console.error('   ⚠️ Very little content scraped. Results may be limited.');
  }

  if (!openaiApiKey) {
    console.log('\n⚠️  No OPENAI_API_KEY found. Saving scraped data only (no AI analysis).');
    const record = {
      id: randomUUID(),
      user_id: 'test-user',
      name: scraped.title || new URL(url.startsWith('http') ? url : `https://${url}`).hostname,
      website_url: url,
      industry: null,
      description: scraped.description || null,
      market_analysis: { raw_content_length: scraped.rawHtmlLength, scrape_only: true },
      target_audience: {},
      value_props: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to team-db
    await saveToTeamDB(record);
    console.log('\n✅ Scraped data saved to database (without AI analysis).');
    console.log('   Set OPENAI_API_KEY to enable AI-powered analysis.');
    return;
  }

  // Step 2: Generate AI analysis
  console.log('\n🤖 Step 2: Generating AI analysis...');
  const formattedContent = formatScrapedContentForPrompt(scraped);
  const prompt = BUSINESS_ANALYSIS_PROMPT
    .replace('{website_url}', url)
    .replace('{scraped_content}', formattedContent);

  const result = await callOpenAIWithRetry<BusinessAnalysis>(
    prompt,
    'You are a business analysis AI. Return only valid JSON.',
    { apiKey: openaiApiKey },
    3
  );

  if (result.error || !result.data) {
    console.error(`   ❌ AI analysis failed: ${result.error}`);
    console.error(`   Raw response: ${result.raw.slice(0, 500)}`);
    process.exit(1);
  }

  const analysis = result.data;
  console.log(`   ✓ Tokens used: ${result.usage.totalTokens}`);
  console.log(`   ✓ Company: ${analysis.name}`);
  console.log(`   ✓ Industry: ${analysis.industry}`);
  console.log(`   ✓ Value Props: ${analysis.value_props?.length || 0}`);

  // Step 3: Save to database
  console.log('\n💾 Step 3: Saving to database...');
  const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  const record: BusinessRecord = {
    id: randomUUID(),
    user_id: 'test-user',
    name: analysis.name || hostname,
    website_url: url,
    industry: analysis.industry,
    description: analysis.description,
    market_analysis: analysis.market_analysis,
    target_audience: analysis.target_audience,
    value_props: analysis.value_props,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await saveToTeamDB(record);
  console.log(`   ✓ Saved with ID: ${record.id}`);

  // Step 4: Output results
  const outputPath = `/tmp/business-analysis-${hostname.replace(/\./g, '-')}.json`;
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Full analysis saved to: ${outputPath}`);

  // Print summary
  console.log(`\n📋 Analysis Summary`);
  console.log(`==================`);
  console.log(`Company: ${analysis.name}`);
  console.log(`Industry: ${analysis.industry}`);
  console.log(`Description: ${analysis.description}`);
  console.log(`\n🎯 Target Audience:`);
  console.log(`   ${analysis.target_audience?.primary}`);
  console.log(`   Company Size: ${analysis.target_audience?.demographics?.company_size}`);
  console.log(`   Roles: ${analysis.target_audience?.demographics?.roles?.join(', ')}`);
  console.log(`\n💪 Value Propositions:`);
  analysis.value_props?.forEach((vp, i) => console.log(`   ${i + 1}. ${vp}`));
  console.log(`\n🔥 Pain Points:`);
  analysis.target_audience?.pain_points?.forEach((pp, i) => console.log(`   ${i + 1}. ${pp}`));
  console.log(`\n🚀 Opportunities:`);
  analysis.market_analysis?.opportunities?.forEach((opp, i) => console.log(`   ${i + 1}. ${opp}`));
  console.log(`\n✅ Pipeline complete!`);
}

// ============================================================
// Database persistence via team-db CLI
// ============================================================

async function saveToTeamDB(record: BusinessRecord): Promise<void> {
  // Create a businesses table in team-db if it doesn't exist
  const createSQL = `
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      website_url TEXT NOT NULL,
      industry TEXT,
      description TEXT,
      market_analysis TEXT DEFAULT '{}',
      target_audience TEXT DEFAULT '{}',
      value_props TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `;

  try {
    execSync(`team-db "${createSQL.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch (e: any) {
    // Table may already exist, that's fine
    if (!e.message?.includes('already exists')) {
      console.warn('   ⚠️ Could not create table:', e.message);
    }
  }

  // Insert the record
  const insertSQL = `INSERT INTO businesses (id, user_id, name, website_url, industry, description, market_analysis, target_audience, value_props, created_at, updated_at) VALUES (
    '${record.id}',
    '${record.user_id}',
    '${escapeSQL(record.name)}',
    '${escapeSQL(record.website_url)}',
    ${record.industry ? `'${escapeSQL(record.industry)}'` : 'NULL'},
    ${record.description ? `'${escapeSQL(record.description)}'` : 'NULL'},
    '${escapeSQL(JSON.stringify(record.market_analysis))}',
    '${escapeSQL(JSON.stringify(record.target_audience))}',
    '${escapeSQL(JSON.stringify(record.value_props))}',
    '${record.created_at}',
    '${record.updated_at}'
  )`;

  try {
    execSync(`team-db "${insertSQL.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch (e: any) {
    console.error('   ❌ Failed to save to team-db:', e.message);
    // Save to file as fallback
    const fallbackPath = `/tmp/business-fallback-${record.id}.json`;
    writeFileSync(fallbackPath, JSON.stringify(record, null, 2));
    console.log(`   📄 Saved to fallback file: ${fallbackPath}`);
  }
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
