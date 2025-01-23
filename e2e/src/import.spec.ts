import { test, expect, Page } from '@playwright/test';
import { GuidedFormCreation, Create } from '../../packages/design/src/FormManager/routes';
import { BASE_URL } from './constants';
import { pathToRegexp } from 'path-to-regexp';

const gotoCreatePage = async (page: Page) => {
  await page.goto(`${BASE_URL}/${GuidedFormCreation.getUrl()}`);
}

// const addQuestions = async (page: Page) => {
//   const menuButton = page.getByRole('button', { name: 'Question', exact: true });
//   await menuButton.click();
//   await page.getByRole('button', { name: 'Short Answer' }).click();
//   await menuButton.click();
//   await page.getByRole('button', { name: 'Radio Buttons' }).click();
// }

test('Import form from sample', async ({ page }) => {
  const { regexp } = pathToRegexp(Create.path);
  await page.goto(`${BASE_URL}/${GuidedFormCreation.getUrl()}`);
  await gotoCreatePage(page);
  await page.getByText('Or use an example file,').click();
  await page.getByRole('button', { name: 'sample-documents/doj-pardon-' }).click()

  let pagePath = '';
  let hasMatch = false;
  await page.waitForURL((url) => {
    if (url.hash.startsWith('#')) {
      pagePath = url.hash.substring(1);
    } else {
      pagePath = url.pathname;
    }
    hasMatch = regexp.test(pagePath);
    return hasMatch;
  });

  expect(hasMatch).toBe(true);
});
