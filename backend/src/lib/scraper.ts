// Web Scraper Module for LeadPulse AI
// Uses fetch + cheerio for lightweight HTML parsing — no API key required
// Falls back gracefully for JS-heavy sites

import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  links: string[];
  meta: Record<string, string>;
  rawHtmlLength: number;
}

/**
 * Scrape a website URL and extract structured text content
 * Follows redirects and handles common error cases
 */
export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  const result: ScrapedContent = {
    url,
    title: '',
    description: '',
    headings: [],
    bodyText: '',
    links: [],
    meta: {},
    rawHtmlLength: 0,
  };

  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LeadPulseAI/1.0; +https://leadpulse.ai)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    result.rawHtmlLength = html.length;

    const $ = cheerio.load(html);

    // Extract title
    result.title = $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() || '';

    // Extract meta description
    result.description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      '';

    // Extract all meta tags
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property') || '';
      const content = $(el).attr('content') || '';
      if (name && content) {
        result.meta[name] = content;
      }
    });

    // Extract headings (h1-h3) for structure
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) result.headings.push(text);
    });

    // Extract body text — remove scripts, styles, nav, footer
    const bodyClone = $('body').clone();
    bodyClone.find('script, style, nav, footer, header, noscript, iframe').remove();
    result.bodyText = bodyClone.text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Cap at 15K chars for LLM context

    // Extract links for subpage discovery
    const baseUrl = new URL(normalizedUrl);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const resolved = new URL(href, normalizedUrl);
          // Only include same-origin links
          if (resolved.hostname === baseUrl.hostname) {
            result.links.push(resolved.href);
          }
        } catch {
          // Skip malformed URLs
        }
      }
    });

    // Deduplicate links
    result.links = [...new Set(result.links)];

    return result;
  } catch (error: any) {
    // Return partial result with error info
    result.meta['scrape_error'] = error.message || 'Unknown error';
    return result;
  }
}

/**
 * Scrape multiple pages from a website (homepage + key subpages)
 * Discovers about, services, products pages from homepage links
 */
export async function scrapeWebsiteDeep(url: string, maxPages = 4): Promise<ScrapedContent> {
  // Start with homepage
  const homepage = await scrapeWebsite(url);

  if (homepage.meta['scrape_error'] || homepage.links.length === 0) {
    return homepage;
  }

  // Find key subpages (about, services, products, etc.)
  const priorityPatterns = [
    /about/i, /services/i, /products/i, /solutions/i,
    /features/i, /how-it-works/i, /company/i, /team/i,
  ];

  const priorityLinks: string[] = [];
  for (const link of homepage.links) {
    if (priorityPatterns.some(p => p.test(link))) {
      priorityLinks.push(link);
    }
    if (priorityLinks.length >= maxPages - 1) break;
  }

  // Scrape subpages in parallel
  const subpages = await Promise.all(
    priorityLinks.map(link => scrapeWebsite(link))
  );

  // Merge content — append subpage text with context
  const allText = [homepage.bodyText];
  for (const page of subpages) {
    if (page.bodyText && !page.meta['scrape_error']) {
      allText.push(`\n--- ${page.title || page.url} ---\n${page.bodyText}`);
    }
  }

  // Merge headings
  const allHeadings = [...homepage.headings];
  for (const page of subpages) {
    allHeadings.push(...page.headings);
  }

  return {
    ...homepage,
    bodyText: allText.join('\n').slice(0, 30000), // Cap at 30K chars
    headings: allHeadings,
  };
}

/**
 * Format scraped content into a condensed summary for the LLM prompt
 */
export function formatScrapedContentForPrompt(content: ScrapedContent): string {
  const parts: string[] = [];

  if (content.title) parts.push(`Page Title: ${content.title}`);
  if (content.description) parts.push(`Meta Description: ${content.description}`);

  if (content.headings.length > 0) {
    parts.push(`Headings:\n${content.headings.slice(0, 20).join('\n')}`);
  }

  if (content.bodyText) {
    parts.push(`Page Content:\n${content.bodyText}`);
  }

  if (content.meta['scrape_error']) {
    parts.push(`[Scrape Warning: ${content.meta['scrape_error']}]`);
  }

  return parts.join('\n\n');
}
