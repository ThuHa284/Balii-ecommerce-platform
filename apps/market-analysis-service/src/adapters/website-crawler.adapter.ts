/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class WebsiteCrawlerAdapter {
  async crawlCanifa(keyword: string) {
    const baseUrl = 'https://canifa.com';
    const url = `${baseUrl}/nu/do-mac-nha`;

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);
    const results: any[] = [];

    console.log('CANIFA HTML LENGTH:', data.length);
    console.log('CANIFA PRODUCT COUNT:', $('.product-item').length);

    $('.product-item').each((_, el) => {
      const name =
        $(el)
          .find('.product-item__name a')
          .text()
          .replace(/\s+/g, ' ')
          .trim() ||
        $(el).find('a[title]').attr('title')?.trim() ||
        $(el).find('img[alt]').attr('alt')?.trim() ||
        '';

      const priceText =
        $(el)
          .find('.product-item__price--normal')
          .text()
          .replace(/\s+/g, ' ')
          .trim() ||
        $(el).find('[class*="price"]').text().replace(/\s+/g, ' ').trim() ||
        $(el)
          .text()
          .match(/[\d.,]+\s?(₫|đ|VNĐ)/i)?.[0] ||
        '';

      const imageUrl =
        $(el).find('.product-item__photo img').attr('src') ||
        $(el).find('.product-item__photo img').attr('data-src') ||
        $(el).find('img').attr('src') ||
        $(el).find('img').attr('data-src');

      const productUrl =
        $(el).find('.product-item__name a').attr('href') ||
        $(el).find('a').first().attr('href');

      const price = this.parsePrice(priceText);

      console.log('CANIFA ITEM:', {
        name,
        priceText,
        price,
      });

      if (name && price > 0) {
        results.push({
          platform: 'website',
          source: 'canifa',
          keyword,
          name,
          price,
          imageUrl: this.normalizeUrl(imageUrl, baseUrl),
          productUrl: this.normalizeUrl(productUrl, baseUrl),
        });
      }
    });

    console.log('CANIFA RESULTS:', results.length);

    return results;
  }

  async crawlSunfly(keyword: string) {
    const url = 'https://sunfly.com.vn/thoi-trang-mac-nha-pc570039.html';

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);

    const results: any[] = [];

    $('.product-item.product_box').each((_, el) => {
      const name = $(el)
        .find('.product-title')
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      const priceText = $(el)
        .find('.product-price-current')
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      const price = this.parsePrice(priceText);

      const imageUrl =
        $(el).find('.product-image img').attr('src') ||
        $(el).find('.product-image img').attr('data-src');

      const productUrl = $(el).find('.product-image a').attr('href');

      console.log('SUNFLY ITEM:', {
        name,
        priceText,
        price,
      });

      if (name && price > 0) {
        results.push({
          platform: 'website',
          source: 'sunfly',
          keyword,
          name,
          price,
          imageUrl: this.normalizeUrl(imageUrl, 'https://sunfly.com.vn'),
          productUrl: this.normalizeUrl(productUrl, 'https://sunfly.com.vn'),
        });
      }
    });

    console.log('SUNFLY RESULTS:', results.length);

    return results;
  }

  private normalizeUrl(url?: string, baseUrl = '') {
    if (!url) return undefined;

    if (url.startsWith('http')) {
      return url;
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private parsePrice(text: string): number {
    if (!text) return 0;

    const match = text.match(/[\d.,]+/);

    if (!match) return 0;

    const normalized = match[0].replace(/\./g, '').replace(/,/g, '');

    return Number(normalized);
  }
}
