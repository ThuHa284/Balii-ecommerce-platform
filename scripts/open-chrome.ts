import { chromium } from 'playwright';

async function main() {
  const context = await chromium.launchPersistentContext(
    'E:\\HocODayNe\\DoAnTotNghiep\\LVTN\\Balii-ecommerce-platform\\storage\\playwright\\chrome-profile',
    {
      headless: false,
      channel: 'chrome',
      viewport: null,
    },
  );

  const page = context.pages()[0] || (await context.newPage());

  await page.goto('https://google.com');

  console.log('Chrome Playwright đã mở');

  // giữ browser không tắt
  await page.waitForTimeout(999999999);
}

main();
