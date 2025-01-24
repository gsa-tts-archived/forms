import { test, expect } from './fixtures/import-file.fixture';
import { enLocale as message } from '@atj/common';

// Delete a component.
// Reorder pages via drag and drop
// Add a new page
//  - Update title
//  - Open dropdown for options and add a package download component - add text to component

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
});

// const addQuestions = async (page: Page) => {
//   const menuButton = page.getByRole('button', { name: 'Question', exact: true });
//   await menuButton.click();
//   await page.getByRole('button', { name: 'Short Answer' }).click();
//   await menuButton.click();
//   await page.getByRole('button', { name: 'Radio Buttons' }).click();
// }
//
// test('Import form from sample', async ({ page }) => {
//   const { regexp } = pathToRegexp(Create.path);
//   await page.goto(`${BASE_URL}/${GuidedFormCreation.getUrl()}`);
//   await gotoCreatePage(page);
//   await page.getByText('Or use an example file,').click();
//   await page.getByRole('button', { name: 'sample-documents/doj-pardon-' }).click()
//
//   let pagePath = '';
//   let hasMatch = false;
//   await page.waitForURL((url) => {
//     if (url.hash.startsWith('#')) {
//       pagePath = url.hash.substring(1);
//     } else {
//       pagePath = url.pathname;
//     }
//     hasMatch = regexp.test(pagePath);
//     return hasMatch;
//   });
//
//   expect(hasMatch).toBe(true);
// });
