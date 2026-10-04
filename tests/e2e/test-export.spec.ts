import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function notebookData(page: Page) {
  // Playwright gives this test its own browser database. It never opens the desktop notebook.
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('atlas-notebook');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const stores = [...db.objectStoreNames];
      const transaction = db.transaction(stores, 'readonly');
      return await Promise.all(
        stores.map(
          (name) =>
            new Promise((resolve, reject) => {
              const request = transaction.objectStore(name).getAll();
              request.onsuccess = () => resolve({ name, rows: request.result });
              request.onerror = () => reject(request.error);
            }),
        ),
      );
    } finally {
      db.close();
    }
  });
}

test('saved tests shows a useful empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Weekly test/ }).click();
  await expect(page.getByRole('heading', { name: 'Saved tests' })).toBeVisible();
  await expect(page.locator('.saved-tests')).toContainText('After you save your first test result');
  await expect(page.getByRole('button', { name: 'Export .txt' })).toHaveCount(0);
});

test('exports selected historical recall answers and leaves the notebook untouched', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(new Date(2026, 8, 20, 12));
  await page.goto('/');
  await page.getByRole('button', { name: 'New topic', exact: true }).first().click();
  await page.getByPlaceholder('What would you like to understand?').fill('Quantum idea');
  await page.getByPlaceholder('e.g. Philosophy').fill('Physics');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
  await page.getByLabel('My explanation', { exact: true }).fill('CHECKLIST REFERENCE');
  await page.getByRole('button', { name: 'Understood', exact: true }).click();
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: /Weekly test/ }).click();
  const oldAnswer = 'Мой ответ две недели назад.\nψ = α|0⟩ + β|1⟩';
  await page.getByRole('textbox', { name: /Your recall notes/ }).fill(oldAnswer);
  await page.getByRole('button', { name: 'I understand · Pass' }).click();
  await expect(page.getByLabel('Saved test day')).toHaveValue('2026-09-20');

  await page.clock.setFixedTime(new Date(2026, 9, 4, 12));
  for (const response of ['My latest answer needs more work.', '']) {
    await page.getByRole('button', { name: 'Checklist', exact: true }).click();
    await page.getByRole('button', { name: 'Quantum idea', exact: true }).click();
    await page.getByRole('button', { name: 'Understood', exact: true }).click();
    await page.getByLabel('Close dialog').click();
    await page.getByRole('button', { name: /Weekly test/ }).click();
    await page.getByRole('textbox', { name: /Your recall notes/ }).fill(response);
    await page
      .getByRole('button', { name: response ? 'Needs review' : 'I understand · Pass', exact: true })
      .click();
  }
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Weekly test/ }).click();
  await expect(page.getByLabel('Saved test day')).toHaveValue('2026-10-04');
  await expect(page.locator('.saved-test-answer')).toHaveCount(2);
  const before = await notebookData(page);
  const latestDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export .txt' }).click();
  const latest = await latestDownload;
  expect(latest.suggestedFilename()).toBe('ATLAS-weekly-test-2026-10-04.txt');
  const latestText = await readFile((await latest.path())!, 'utf8');
  expect(latestText).toContain('My latest answer needs more work.');
  expect(latestText).toContain('Self-assessment: Needs review');
  expect(latestText).toContain('[No recall notes were written for this test.]');
  expect(latestText).not.toContain(oldAnswer);
  expect(latestText).not.toContain('CHECKLIST REFERENCE');

  await page.getByLabel('Saved test day').selectOption('2026-09-20');
  await page.locator('.saved-test-answer summary').click();
  await expect(page.locator('.saved-test-answer p')).toHaveText(oldAnswer);
  const oldDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export .txt' }).click();
  const old = await oldDownload;
  expect(old.suggestedFilename()).toBe('ATLAS-weekly-test-2026-09-20.txt');
  const oldText = await readFile((await old.path())!, 'utf8');
  expect(oldText).toContain('Topic: Quantum idea');
  expect(oldText).toContain(oldAnswer);
  expect(oldText).not.toContain('My latest answer');
  expect(oldText).not.toContain('CHECKLIST REFERENCE');
  expect(await notebookData(page)).toEqual(before);
  await page.locator('.saved-tests').screenshot({ path: 'test-results/weekly-test-export.png' });
});
