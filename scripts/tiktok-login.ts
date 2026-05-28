/* eslint-disable @typescript-eslint/no-misused-promises */
import { chromium } from 'playwright';

async function main() {
  const context = await chromium.launchPersistentContext(
    'E:\\HocODayNe\\DoAnTotNghiep\\LVTN\\Balii-ecommerce-platform\\storage\\playwright\\tiktok-profile',
    {
      headless: false,
      channel: 'chrome',
      viewport: null,
    },
  );

  const page = context.pages()[0] || (await context.newPage());

  await page.goto('https://shop.tiktok.com/vn', {
    waitUntil: 'domcontentloaded',
  });

  console.log('Hãy login TikTok thủ công trong cửa sổ Chrome vừa mở.');
  console.log('Login xong thì quay lại terminal và bấm Enter.');

  process.stdin.resume();
  process.stdin.once('data', async () => {
    await context.storageState({
      path: 'storage/playwright/tiktok-state.json',
    });

    console.log('Đã lưu session TikTok.');
    await context.close();
    process.exit(0);
  });
}

main();
