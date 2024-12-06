import FirecrawlApp from '@mendable/firecrawl-js';
import { OpenAIService } from './OpenAIService';

// New type definition
type SearchNecessityResponse = 0 | 1;

export class WebSearchService {
  private openaiService: OpenAIService;
  private allowedDomains: { name: string, url: string, scrappable: boolean }[];
  private apiKey: string;
  private firecrawlApp: FirecrawlApp;

  constructor(allowedDomains: { name: string, url: string, scrappable: boolean }[]) {
    this.openaiService = new OpenAIService();
    this.allowedDomains = allowedDomains;
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.firecrawlApp = new FirecrawlApp({ apiKey: this.apiKey });
  }

  async scrapeUrls(urls: string[]): Promise<{ url: string, content: string }[]> {
    // Filter out URLs that are not scrappable based on allowedDomains
    const scrappableUrls = urls.filter(url => {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      console.log('domain:', domain);
      const allowedDomain = this.allowedDomains.find(d => d.url === domain);
      console.log('allowedDomain:', allowedDomain);
      return allowedDomain && allowedDomain.scrappable;
    });

    console.log('scrappableUrls:', scrappableUrls);

    const scrapePromises = scrappableUrls.map(async (url) => {
      try {
        const scrapeResult = await this.firecrawlApp.scrapeUrl(url, { formats: ['markdown'] });
        
        if (scrapeResult && scrapeResult.markdown) {
            console.log('scrapeResult:', scrapeResult);
          return { url, content: scrapeResult.markdown };
        } else {
          console.warn(`No markdown content found for URL: ${url}`);
          return { url, content: '' };
        }
      } catch (error) {
        console.error(`Error scraping URL ${url}:`, error);
        return { url, content: '' };
      }
    });

    const scrapedResults = await Promise.all(scrapePromises);
    return scrapedResults.filter(result => result.content !== '');
  }
}
