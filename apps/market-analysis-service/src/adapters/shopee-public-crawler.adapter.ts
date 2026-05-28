/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';

@Injectable()
export class ShopeePublicCrawlerAdapter {
  async searchSleepwear(keyword: string) {
    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
    });

    const page = await browser.newPage({
      viewport: null,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });

    await page.goto(
      `https://shopee.vn/search?keyword=${encodeURIComponent(keyword)}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      },
    );

    console.log('CURRENT URL:', page.url());
    console.log('Nếu Shopee yêu cầu login/verify thì tự làm thủ công.');

    await page.waitForTimeout(60000);

    const products = await page.evaluate((kw) => {
      const results: any[] = [];

      const cards = document.querySelectorAll('li, div');

      cards.forEach((card) => {
        const text = card.textContent?.replace(/\s+/g, ' ').trim() || '';

        if (!text.includes('₫')) return;

        const priceMatch = text.match(/₫\s?[\d.]+/);
        const priceText = priceMatch?.[0] || '';
        const price = Number(priceText.replace(/[^\d]/g, ''));

        const img = card.querySelector('img');
        const imageUrl = img?.getAttribute('src') || '';

        const link = card.querySelector('a');
        const href = link?.getAttribute('href') || '';

        const name =
          img?.getAttribute('alt') ||
          link?.textContent?.replace(/\s+/g, ' ').trim() ||
          '';

        if (name && price > 0) {
          results.push({
            platform: 'shopee_public',
            source: 'shopee',
            keyword: kw,
            name,
            price,
            priceText,
            imageUrl,
            productUrl: href.startsWith('http')
              ? href
              : `https://shopee.vn${href}`,
          });
        }
      });

      return results.slice(0, 30);
    }, keyword);

    console.log('SHOPEE PRODUCTS:', products.length);

    await browser.close();

    return products;
  }
}
