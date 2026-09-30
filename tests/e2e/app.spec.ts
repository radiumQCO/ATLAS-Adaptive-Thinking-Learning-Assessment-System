import { expect, test } from '@playwright/test';

async function addFirstTopic(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'New topic', exact: true }).first().click();
  await page.getByPlaceholder('What would you like to understand?').fill(name);
  await page.getByPlaceholder('e.g. Philosophy').fill('My subject');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
}

test('topics can be created, edited, searched and saved after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Make room for/ })).toBeVisible();
  await page.getByRole('button', { name: 'New topic', exact: true }).first().click();
  await page.getByPlaceholder('What would you like to understand?').fill('My Test Concept');
  await page.getByPlaceholder('e.g. Philosophy').fill('My subject');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'TOPIC NOTEBOOK' })).toBeVisible();
  await page.getByLabel('Topic name').fill('My Saved Concept');
  await page.getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByRole('button', { name: 'Understood', exact: true }).click();
  await page.getByRole('button', { name: 'Passed', exact: true }).click();
  await page.getByLabel('Close dialog').click();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await page.getByLabel('Search topics').fill('My Saved Concept');
  await expect(page.getByRole('button', { name: 'My Saved Concept', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('map pans and zooms, study timer survives navigation', async ({ page }) => {
  await page.goto('/');
  await addFirstTopic(page, 'Study Map Topic');
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Knowledge map' }).click();
  const canvas = page.getByTestId('knowledge-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(400);
  const beforePan = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Map canvas has no bounds.');
  await page.mouse.move(bounds.x + 60, bounds.y + 350);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 160, bounds.y + 400, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect((await canvas.screenshot()).equals(beforePan)).toBe(false);
  await canvas.hover({ position: { x: 80, y: 80 } });
  await page.mouse.wheel(0, -250);
  await expect(page.getByText(/%/).first()).not.toHaveText('100%');
  await page.getByRole('button', { name: 'Fit map to view' }).click();
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await expect(page.getByLabel('Time remaining')).toHaveText('00:25:00');
  await page.getByLabel('Focus minutes').fill('15');
  await expect(page.getByLabel('Time remaining')).toHaveText('00:15:00');
  await page.getByRole('button', { name: 'Begin focus' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByRole('button', { name: 'Begin focus' })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Small days/ })).toBeVisible();
});

test('settings theme and backup controls work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Create backup' }).click();
  await expect(page.locator('.backup-list > div').first()).toContainText('Manual');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('map placement, RGB territory and keyboard movement persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New topic', exact: true }).first().click();
  await page.getByPlaceholder('What would you like to understand?').fill('Map Interaction Topic');
  await page.getByPlaceholder('e.g. Philosophy').fill('My subject');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Knowledge map' }).click();
  await page.getByRole('button', { name: 'Place a topic' }).first().click();
  await page.locator('.topic-picker button').filter({ hasText: 'Map Interaction Topic' }).click();
  if ((await page.locator('dialog[open]').count()) === 0) {
    await page.locator('.map-selection').getByLabel('Move to country').selectOption('new');
  }
  await page.getByLabel('New country name').fill('My Territory');
  await page.getByLabel('Hex color').fill('#4A79B8');
  await page.getByRole('button', { name: 'Create territory' }).click();
  await expect(page.locator('.map-selection')).toContainText('Map Interaction Topic');
  await page.locator('.map-selection').getByLabel('Move cell right').click();
  await expect(page.locator('.map-selection')).toContainText('Map Interaction Topic');
  await page.reload();
  await page.getByRole('button', { name: 'Knowledge map' }).click();
  await page.getByText('Map index · keyboard navigation').click();
  await expect(
    page.locator('.map-accessible-list').getByRole('button', { name: /Map Interaction Topic/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'My Territory' })).toBeVisible();
});

test('retention decision and backup restore are saved', async ({ page }) => {
  await page.goto('/');
  await addFirstTopic(page, 'Review Topic');
  await page.getByRole('button', { name: 'Understood', exact: true }).click();
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: /Weekly test/ }).click();
  const queueBefore = await page.locator('.review-queue button').count();
  await page.getByRole('button', { name: /I understand · Pass/ }).click();
  await expect(page.locator('.review-queue button')).toHaveCount(queueBefore - 1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Create backup' }).click();
  await expect(page.locator('.backup-list > div').first()).toContainText('Manual');
  await page.getByRole('button', { name: 'New topic', exact: true }).first().click();
  await page.getByPlaceholder('What would you like to understand?').fill('Temporary Restore Topic');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
  await page.getByLabel('Close dialog').click();
  await page.locator('.backup-list > div').first().getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Restore backup' }).click();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await page.getByLabel('Search topics').fill('Temporary Restore Topic');
  await expect(page.getByText('No matching ideas')).toBeVisible();
});

test('first launch is empty and can accept a new subject', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await expect(page.getByText('Your first blank page')).toBeVisible();
  await page.getByRole('button', { name: 'Civilization', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'A world built from understanding' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Begin the atlas' }).click();
  await expect(page.getByText(/0 map civilizations/)).toBeVisible();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await page.getByRole('button', { name: 'Add your first topic' }).click();
  await page.getByPlaceholder('What would you like to understand?').fill('A Personal Idea');
  await page.getByPlaceholder('e.g. Philosophy').fill('Philosophy');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
  await expect(page.getByLabel('Topic name')).toHaveValue('A Personal Idea');
  await page.reload();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await expect(page.getByRole('button', { name: 'A Personal Idea', exact: true })).toBeVisible();
});

test('civilization quote, linked knowledge and sound controls persist', async ({ page }) => {
  await page.goto('/');
  await addFirstTopic(page, 'Electricity');
  await page.getByRole('button', { name: 'Understood', exact: true }).click();
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Knowledge map' }).click();
  await page.getByRole('button', { name: 'Place a topic' }).first().click();
  await page.locator('.topic-picker button').filter({ hasText: 'Electricity' }).click();
  if ((await page.locator('dialog[open]').count()) === 0) {
    await page.locator('.map-selection').getByLabel('Move to country').selectOption('new');
  }
  await page.getByLabel('New country name').fill('Energy');
  await page.getByRole('button', { name: 'Create territory' }).click();
  await page.getByRole('button', { name: 'Civilization', exact: true }).click();
  await page.getByRole('button', { name: 'Begin the atlas' }).click();
  await expect(page.getByRole('button', { name: /Energy.*1 cells/ })).toBeVisible();
  await page.getByRole('button', { name: /Electrical Grid/ }).click();
  await expect(page.getByText(/A single current crossed the darkness/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Electricity ·/ })).toBeVisible();
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Sound effects')).toBeChecked();
  await page.getByLabel('Sound volume').fill('0.2');
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Sound volume')).toHaveValue('0.2');
});

test('countdown completes with an in-app notification and saved session', async ({ page }) => {
  await page.goto('/');
  await addFirstTopic(page, 'Timed Topic');
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await page.getByLabel('Focus minutes').fill('1');
  await page.clock.install();
  await page.getByRole('button', { name: 'Begin focus' }).click();
  await expect(page.getByLabel('Time remaining')).toHaveText('00:01:00');
  await page.clock.fastForward(60_500);
  await expect(page.getByRole('dialog', { name: 'Focus complete' })).toBeVisible();
  await expect(page.getByText('1 minute of focused learning.')).toBeVisible();
  await page.getByRole('button', { name: 'Beautiful work' }).click();
  await expect(page.getByRole('button', { name: 'Begin focus' })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Timed Topic' })).toBeVisible();
});

test('checklist deletes a topic in one click and automatic backups can be disabled', async ({
  page,
}) => {
  await page.goto('/');
  await addFirstTopic(page, 'Quick Delete');
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete Quick Delete' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Quick Delete' }).click();
  await expect(page.getByText('Your first blank page')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Automatic backups').uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Automatic backups')).not.toBeChecked();
});

test('full reset waits ten seconds and clears local data and backups', async ({ page }) => {
  await page.goto('/');
  await addFirstTopic(page, 'Erase Me');
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Create backup' }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Reset everything' }).click();
  const confirm = page.getByRole('dialog', { name: 'Reset all ATLAS data?' });
  await expect(confirm.getByRole('button', { name: 'Erase everything' })).toBeDisabled();
  await page.clock.fastForward(10_100);
  await expect(confirm.getByRole('button', { name: 'Erase everything' })).toBeEnabled();
  await confirm.getByRole('button', { name: 'Erase everything' }).click();
  await expect(page.getByRole('heading', { name: /Make room for/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await expect(page.getByText('Your first blank page')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.backup-list')).toContainText('No backups yet.');
});

test('phone and tablet layouts keep navigation and content usable', async ({ browser }) => {
  for (const width of [390, 820]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: width < 600,
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Make room for/ })).toBeVisible();
    if (width < 600) {
      await page.getByLabel('Toggle navigation').click();
      await page.getByRole('button', { name: 'Civilization', exact: true }).click();
    } else await page.getByRole('button', { name: 'Civilization', exact: true }).click();
    await page.getByRole('button', { name: 'Begin the atlas' }).click();
    await expect(page.getByRole('heading', { name: 'Civilization.' })).toBeVisible();
    for (const name of [
      'Checklist',
      'Knowledge map',
      'Study',
      'History',
      'Weekly test',
      'Settings',
    ]) {
      if (width < 600) await page.getByLabel('Toggle navigation').click();
      await page.getByRole('button', { name, exact: true }).click();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${name} at ${width}px`).toBeLessThanOrEqual(2);
    }
    await context.close();
  }
});
