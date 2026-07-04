// Quick test: scrape a website and verify content extraction
// Usage: node --import tsx backend/src/scripts/test-scraper.ts <url>

import { scrapeWebsiteDeep, formatScrapedContentForPrompt } from '../lib/scraper.js';

async function main() {
  const url = process.argv[2] || 'https://cto.new';

  console.log(`Testing scraper on: ${url}\n`);

  const scraped = await scrapeWebsiteDeep(url, 3);

  console.log('=== SCRAPER RESULTS ===');
  console.log(`Title: ${scraped.title}`);
  console.log(`Description: ${scraped.description}`);
  console.log(`Body text length: ${scraped.bodyText.length} chars`);
  console.log(`Headings (${scraped.headings.length}):`);
  scraped.headings.slice(0, 10).forEach(h => console.log(`  - ${h}`));
  console.log(`Links found: ${scraped.links.length}`);
  console.log(`Raw HTML length: ${scraped.rawHtmlLength}`);
  if (scraped.meta['scrape_error']) {
    console.log(`Scrape error: ${scraped.meta['scrape_error']}`);
  }

  console.log('\n=== FORMATTED FOR PROMPT (first 2000 chars) ===');
  const formatted = formatScrapedContentForPrompt(scraped);
  console.log(formatted.slice(0, 2000));
  console.log(`\n... (total ${formatted.length} chars)`);
}

main().catch(console.error);
