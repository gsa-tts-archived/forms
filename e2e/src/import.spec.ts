import { test, expect } from './fixtures/import-file.fixture';
import { enLocale as message } from '@atj/common';

// Reorder pages via drag and drop

test.describe('Import form from a provided sample', () => {
  test('Verify the form import was successful', async ({ page, formUrl }) => {
    await page.goto(formUrl);
    await expect(page.getByText('Blueprint loaded')).toBeVisible();
  });

  test('Edit page title', async ({ page, formUrl }) => {
    await page.goto(formUrl);
    await page.getByText('0 *').click();
    const input = page.getByLabel('Page title');
    await input.fill('My awesome form page');
    await page.getByRole('button', {name: 'Save and Close'}).click();
    await expect(page.getByRole('link', { name: 'My awesome form page' })).toBeVisible();
  });

  test('Add a rich text component and format text', async ({ page, formUrl }) => {
    const editorText = 'This is some text entered in the rich text editor';
    await page.goto(formUrl);
    await page.locator('.usa-sidenav').first().waitFor();
    const menuButton = page.getByRole('button', { name: 'Question', exact: true });
    await menuButton.click();
    await page.getByRole('button', { name: message.patterns.richText.displayName }).click();
    const editor = page.locator('div[contenteditable="true"]');
    await editor.fill(editorText);
    await page.getByRole('button', { name: 'Heading', exact: true }).click();
    await page.getByRole('button', { name: 'Save and Close', exact: true }).click();
    expect(page.getByRole('heading', { name: editorText })).toBeDefined();
  });

  test('Move question to another page', async ({ page, formUrl }) => {
    const destinationPage = '1';
    await page.goto(`${formUrl}?page=2`);
    await page.getByText('Name:').click();
    await page.getByRole('button', { name: 'Move questions' }).click();
    await page.getByLabel('Page:').selectOption(destinationPage);
    await page.getByLabel('Position:').selectOption('top');
    await page.getByRole('button', { name: 'Move these questions to another page' }).click();
    await expect(page.getByText('Name:')).not.toBeVisible();
    await page.goto(`${formUrl}?page=${destinationPage}`);

    // The moved element gets focus when switching to the new page.
    // Clearing the focus with and enter keypress allows us to then select it by text.
    await page.keyboard.press('Enter');
    await expect(page.getByText('Name:')).toBeVisible();
  });

  test('Delete a question/pattern', async ({ page, formUrl }) => {
    // Deleting a pattern asks the user to confirm. The user needs to accept the message
    // before the component is deleted, so we need to listen for the event here and accept
    // in order for the test to pass.
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto(`${formUrl}?page=2`);
    const pattern = page.getByText('(state) (docket number) United States');
    await pattern.click();
    await page.getByRole('button', { name: 'Delete this pattern' }).click();
    await expect(pattern).not.toBeVisible();
  });

  test('Add a new page with a package download component', async ({ page, formUrl }) => {
    await page.goto(formUrl);
    await page.getByRole('button', { name: 'Page' }).click();
    await page.getByRole('link', { name: 'Untitled Page' }).click();
    await page.getByRole('button', { name: 'Question', exact: true }).click();
    await page.getByRole('button', { name: message.patterns.packageDownload.displayName }).click();
    await page.getByLabel(message.patterns.packageDownload.fieldLabel).fill('Download your documents');
    await page.getByRole('button', {name: 'Save and Close'}).click();
    await expect(page.getByRole('button', {name: 'Download PDF'})).toBeVisible();
  });
});
