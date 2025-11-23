import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, TaskStatus, Knowledge, MessageType } from '../types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

interface ScrapingResult {
  url: string;
  title?: string;
  data: any;
  scrapedAt: Date;
  method: 'static' | 'dynamic';
}

export class WebScraperAgent extends BaseAgent {
  private browser: Browser | null = null;
  private learnedSelectors: Map<string, string[]> = new Map();

  constructor() {
    super('WebScraper', AgentRole.WEB_SCRAPER, [
      'web scraping',
      'data extraction',
      'html parsing',
      'javascript rendering',
      'content collection'
    ]);

    this.initializeBrowser();
  }

  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('[WebScraper] Browser initialized');
    } catch (error) {
      console.error('[WebScraper] Failed to initialize browser:', error);
    }
  }

  async executeTask(task: Task): Promise<ScrapingResult> {
    this.setStatus('working' as any);

    try {
      const taskData = JSON.parse(task.description);
      const { url, selectors, useJavaScript } = taskData;

      let result: ScrapingResult;

      if (useJavaScript) {
        result = await this.scrapeDynamic(url, selectors);
      } else {
        result = await this.scrapeStatic(url, selectors);
      }

      await this.sendMessage(
        task.assignedTo,
        JSON.stringify({ taskId: task.id, result }),
        MessageType.TASK_RESULT
      );

      return result;
    } catch (error) {
      console.error('[WebScraper] Task failed:', error);
      throw error;
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async scrapeStatic(url: string, selectors?: Record<string, string>): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const data: any = {};

      if (selectors) {
        for (const [key, selector] of Object.entries(selectors)) {
          const elements = $(selector);
          if (elements.length === 1) {
            data[key] = elements.text().trim();
          } else if (elements.length > 1) {
            data[key] = elements.map((i, el) => $(el).text().trim()).get();
          }
        }
      } else {
        data.title = $('title').text();
        data.headings = $('h1, h2, h3').map((i, el) => $(el).text().trim()).get();
        data.paragraphs = $('p').map((i, el) => $(el).text().trim()).get().slice(0, 10);
        data.links = $('a[href]').map((i, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href')
        })).get().slice(0, 20);
      }

      const result: ScrapingResult = {
        url,
        title: $('title').text(),
        data,
        scrapedAt: new Date(),
        method: 'static'
      };

      console.log(`[WebScraper] Static scrape completed: ${url}`);
      return result;
    } catch (error) {
      console.error('[WebScraper] Static scrape failed:', error);
      throw new Error(`Failed to scrape ${url}: ${error}`);
    }
  }

  async scrapeDynamic(url: string, selectors?: Record<string, string>): Promise<ScrapingResult> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    if (!this.browser) {
      throw new Error('Browser not available');
    }

    let page: Page | null = null;

    try {
      page = await this.browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await page.waitForTimeout(2000);

      const data: any = {};

      if (selectors) {
        for (const [key, selector] of Object.entries(selectors)) {
          try {
            const elements = await page.$$(selector);
            if (elements.length === 1) {
              data[key] = await page.$eval(selector, el => el.textContent?.trim());
            } else if (elements.length > 1) {
              data[key] = await page.$$eval(selector, els => els.map(el => el.textContent?.trim()));
            }
          } catch (error) {
            console.warn(`[WebScraper] Selector failed: ${selector}`, error);
          }
        }
      } else {
        data.title = await page.title();
        data.url = page.url();
        data.content = await page.evaluate(() => {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim());
          const paragraphs = Array.from(document.querySelectorAll('p')).map(el => el.textContent?.trim()).slice(0, 10);
          const links = Array.from(document.querySelectorAll('a[href]')).map(el => ({
            text: el.textContent?.trim(),
            href: el.getAttribute('href')
          })).slice(0, 20);

          return { headings, paragraphs, links };
        });
      }

      const result: ScrapingResult = {
        url,
        title: await page.title(),
        data,
        scrapedAt: new Date(),
        method: 'dynamic'
      };

      console.log(`[WebScraper] Dynamic scrape completed: ${url}`);
      return result;
    } catch (error) {
      console.error('[WebScraper] Dynamic scrape failed:', error);
      throw new Error(`Failed to scrape ${url}: ${error}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async scrapeMultiplePages(urls: string[], useJavaScript: boolean = false): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    for (const url of urls) {
      try {
        const result = useJavaScript
          ? await this.scrapeDynamic(url)
          : await this.scrapeStatic(url);
        results.push(result);

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      } catch (error) {
        console.error(`[WebScraper] Failed to scrape ${url}:`, error);
      }
    }

    return results;
  }

  async extractStructuredData(url: string, schema: Record<string, string>): Promise<any> {
    const result = await this.scrapeDynamic(url, schema);
    return result.data;
  }

  async monitorPage(url: string, checkIntervalMs: number, onChange: (changes: any) => void): Promise<() => void> {
    let previousContent: string | null = null;

    const intervalId = setInterval(async () => {
      try {
        const result = await this.scrapeStatic(url);
        const currentContent = JSON.stringify(result.data);

        if (previousContent && currentContent !== previousContent) {
          onChange({
            url,
            previous: JSON.parse(previousContent),
            current: result.data,
            timestamp: new Date()
          });
        }

        previousContent = currentContent;
      } catch (error) {
        console.error('[WebScraper] Monitor error:', error);
      }
    }, checkIntervalMs);

    return () => clearInterval(intervalId);
  }

  async learn(knowledge: Knowledge): Promise<void> {
    if (knowledge.category === 'scraping_pattern') {
      const { domain, selectors } = JSON.parse(knowledge.content);
      this.learnedSelectors.set(domain, selectors);
      console.log(`[WebScraper] Learned selectors for ${domain}`);
    }

    this.knowledgeBase.push(knowledge);
  }

  async teach(): Promise<Knowledge[]> {
    const teachings: Knowledge[] = [];

    for (const [domain, selectors] of this.learnedSelectors.entries()) {
      teachings.push({
        id: uuidv4(),
        source: this.getId(),
        content: JSON.stringify({ domain, selectors }),
        category: 'scraping_pattern',
        tags: ['web-scraping', 'selectors', domain],
        createdAt: new Date(),
        usefulness: 0.8
      });
    }

    return teachings;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[WebScraper] Browser closed');
    }
  }
}
