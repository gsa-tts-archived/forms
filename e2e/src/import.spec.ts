import { test as base, expect } from '@playwright/test';
import { GuidedFormCreation, Create } from '../../packages/design/src/FormManager/routes';
import { BASE_URL } from './constants';
import { pathToRegexp } from 'path-to-regexp';
import { enLocale as message } from '@atj/common';

type FormImportFixture = {
  formUrl: string;
};

const test = base.extend<FormImportFixture>({
  formUrl: async ({ page }, use) => {
    const { regexp } = pathToRegexp(Create.path);
    await page.goto(`${BASE_URL}/${GuidedFormCreation.getUrl()}`);
    await page.getByText('Or use an example file,').click();
    await page.getByRole('button', { name: 'sample-documents/doj-pardon-' }).click();

    await page.waitForURL((url) => {
      const pagePath = url.hash.startsWith('#') ? url.hash.substring(1) : url.pathname;
      return regexp.test(pagePath);
    });

    // the 'use' is the key for making this fixture available to other tests.
    const generatedFormUrl = page.url();
    await use(generatedFormUrl);
  },
});

// Format imported text as h2 using rich text editor
// Move component between pages.
// Navigate to new page.
// Delete a component.
// Reorder pages via drag and drop
// Add a new page
// Update title
// Open dropdown for options and add a package download component - add text to component

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
