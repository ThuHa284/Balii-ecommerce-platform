const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCurrency(text) {
  if (/(₫|đ|vnd)/i.test(text)) {
    return 'VND';
  }

  if (/\$/.test(text)) {
    return 'USD';
  }

  return null;
}

function extractPrice(text) {
  const normalized = normalizeWhitespace(text);
  const match =
    normalized.match(/(?:₫|đ|VND)\s*([\d.,]+)/i) ||
    normalized.match(/([\d.,]+)\s*(?:₫|đ|VND)/i) ||
    normalized.match(/\$\s*([\d.,]+)/i);

  if (!match?.[1]) {
    return null;
  }

  const digits = match[1].replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function inferShopName(urlString) {
  try {
    const hostname = new URL(urlString).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return null;
  }
}

async function detectBlockedPage(page) {
  const currentUrl = page.url();
  const pageText = normalizeWhitespace(await page.locator('body').innerText());

  const blockedPatterns = [
    'This page appears when Google automatically detects requests',
    'in violation of the Terms of Service',
    'solving the above CAPTCHA',
    'support.google.com/websearch/answer/86640',
    'unusual traffic from your computer network',
  ];

  const isBlockedUrl =
    currentUrl.includes('/sorry/') || currentUrl.includes('google.com/sorry');
  const isBlockedText = blockedPatterns.some((pattern) =>
    pageText.toLowerCase().includes(pattern.toLowerCase()),
  );

  if (isBlockedUrl || isBlockedText) {
    throw new Error(
      'Google Lens is blocking automated requests for the current IP. Complete the CAPTCHA manually or wait before retrying.',
    );
  }
}

async function collectResults(page, limit) {
  await page.waitForTimeout(7000);
  await detectBlockedPage(page);

  return page.evaluate((maxItems) => {
    const normalize = (value) =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    const inferCurrency = (text) => {
      if (/(₫|đ|vnd)/i.test(text)) {
        return 'VND';
      }

      if (/\$/.test(text)) {
        return 'USD';
      }

      return null;
    };

    const extractPrice = (text) => {
      const normalized = normalize(text);
      const match =
        normalized.match(/(?:₫|đ|VND)\s*([\d.,]+)/i) ||
        normalized.match(/([\d.,]+)\s*(?:₫|đ|VND)/i) ||
        normalized.match(/\$\s*([\d.,]+)/i);

      if (!match?.[1]) {
        return null;
      }

      const digits = match[1].replace(/[^\d]/g, '');
      return digits ? Number(digits) : null;
    };

    const inferShopName = (urlString) => {
      try {
        return new URL(urlString).hostname.replace(/^www\./, '');
      } catch {
        return null;
      }
    };

    const candidates = [];
    const seen = new Set();
    const anchors = Array.from(document.querySelectorAll('a[href]'));

    for (const anchor of anchors) {
      const href = anchor.href;

      if (!href || seen.has(href)) {
        continue;
      }

      if (
        href.startsWith('https://google.com') ||
        href.startsWith('https://www.google.com') ||
        href.startsWith('https://lens.google.com') ||
        href.startsWith('https://support.google.com') ||
        href.startsWith('javascript:')
      ) {
        continue;
      }

      const container =
        anchor.closest('[role="listitem"]') ||
        anchor.closest('div') ||
        anchor.parentElement;
      const text = normalize(
        [anchor.textContent, container?.textContent].filter(Boolean).join(' '),
      );

      if (text.length < 8) {
        continue;
      }

      const image =
        anchor.querySelector('img') ||
        container?.querySelector('img') ||
        null;

      const title = normalize(
        anchor.getAttribute('aria-label') ||
          image?.getAttribute('alt') ||
          text.split(' · ')[0] ||
          text,
      );

      if (!title || title.length < 4) {
        continue;
      }

      const price = extractPrice(text);
      const currency = inferCurrency(text);
      const imageUrl =
        image?.getAttribute('src') ||
        image?.getAttribute('data-src') ||
        image?.currentSrc ||
        null;
      const shopName = inferShopName(href);

      seen.add(href);
      candidates.push({
        title,
        price,
        currency,
        shopName,
        source: shopName,
        imageUrl,
        productUrl: href,
        confidenceScore: null,
        rawData: {
          snippet: text.slice(0, 500),
        },
      });

      if (candidates.length >= maxItems) {
        break;
      }
    }

    return candidates;
  }, limit);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.max(1, Math.min(Number(args.limit || 10), 20));
  const imageUrl = args.imageUrl ? String(args.imageUrl) : null;
  const imagePath = args.imagePath ? path.resolve(String(args.imagePath)) : null;
  const headless = String(process.env.LENS_BROWSER_HEADLESS || 'true') !== 'false';

  if (!imageUrl && !imagePath) {
    throw new Error('Missing --imageUrl or --imagePath');
  }

  if (imagePath && !fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const browser = await chromium.launch({
    headless,
    channel: 'chrome',
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
    });

    page.setDefaultTimeout(60000);

    if (imageUrl) {
      await page.goto(
        `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
        {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        },
      );
    } else {
      await page.goto('https://lens.google.com/upload', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(imagePath);
    }

    await page.waitForLoadState('domcontentloaded');
    const results = await collectResults(page, limit);

    process.stdout.write(
      JSON.stringify({
        success: true,
        data: results,
      }),
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  process.stderr.write(
    JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
