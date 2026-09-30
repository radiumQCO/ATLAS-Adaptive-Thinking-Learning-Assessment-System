import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:1421';
await mkdir('docs/previews', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await desktop.newPage();
  await page.goto(base);
  await page.getByRole('heading', { name: /Make room for/ }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/previews/home.png' });
  for (const [index, name] of ['Electricity', 'Voltage', 'Current'].entries()) {
    await page.getByRole('button', { name: 'New topic', exact: true }).first().click();
    await page.getByPlaceholder('What would you like to understand?').fill(name);
    if (index === 0) await page.getByPlaceholder('e.g. Philosophy').fill('Physics');
    await page.getByRole('button', { name: 'Add topic', exact: true }).click();
    await page.getByRole('button', { name: 'Understood', exact: true }).click();
    await page.getByLabel('Close dialog').click();
  }
  await page.waitForTimeout(3600);
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/previews/checklist.png' });
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/previews/study.png' });
  await page.getByRole('button', { name: 'Knowledge map' }).click();
  for (const name of ['Electricity', 'Voltage', 'Current']) {
    await page.getByRole('button', { name: 'Place a topic' }).first().click();
    await page.locator('.topic-picker button').filter({ hasText: name }).click();
    if (name === 'Electricity') {
      await page.getByLabel('New country name').fill('Energy');
      await page.getByRole('button', { name: 'Create territory' }).click();
    } else if ((await page.locator('dialog[open]').count()) > 0) {
      await page.locator('.country-option').filter({ hasText: 'Energy' }).click();
    }
  }
  await page.getByRole('button', { name: 'Civilization', exact: true }).click();
  await page.getByRole('button', { name: 'Begin the atlas' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'docs/previews/civilization.png' });
  await desktop.close();

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await phone.newPage();
  await mobilePage.goto(base);
  await mobilePage.getByRole('heading', { name: /Make room for/ }).waitFor();
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: 'docs/previews/phone.png' });
  await phone.close();
} finally {
  await browser.close();
}
