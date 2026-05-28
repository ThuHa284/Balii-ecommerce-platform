/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';

@Injectable()
export class TiktokPublicCrawlerAdapter {
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
      'https://shop.tiktok.com/vn/c/women-s-sleepwear-loungewear/843016',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      },
    );

    console.log('CURRENT URL:', page.url());
    console.log('Nếu có captcha thì tự verify thủ công.');

    // chờ bạn verify thủ công
    await page.waitForTimeout(60000);

    const products = await page.evaluate((kw) => {
      const results: any[] = [];

      document.querySelectorAll('div.rounded-xl').forEach((card) => {
        const img = card.querySelector('img');

        const name =
          img?.getAttribute('title') || img?.getAttribute('alt') || '';

        const priceEl =
          card.querySelector('span.H2-Semibold') ||
          Array.from(card.querySelectorAll('span')).find((span) =>
            span.textContent?.match(/[₫đ]?\s?[\d.]+/),
          );

        const priceText = priceEl?.textContent?.trim() || '';
        const price = Number(priceText.replace(/[^\d]/g, ''));

        const imageUrl = img?.getAttribute('src') || '';

        if (name && price > 0) {
          results.push({
            platform: 'tiktok_shop_public',
            source: 'tiktok_shop',
            keyword: kw,
            name,
            price,
            imageUrl,
          });
        }
      });

      return results.slice(0, 30);
    }, keyword);

    console.log('TIKTOK PRODUCTS:', products.length);

    await browser.close();

    return products;
  }
}
