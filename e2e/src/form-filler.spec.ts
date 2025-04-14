import { test, expect } from './fixtures/add-download.fixture.js';
import { FormFillerPage } from './models/form-filler-page.js';
import { match } from 'path-to-regexp';
import { Create } from '../../packages/design/src/FormManager/routes';

test.describe('Fill a form as an applicant', () => {
  const getFormParams = (url: URL) => {
    const matcher = match(Create.path);
    let pagePath = '';
    if (url.hash.startsWith('#')) {
      pagePath = url.hash.substring(1);
    } else {
      pagePath = url.pathname;
    }

    return matcher(pagePath);
  }

  test('Next button navigation', async ({ page, formUrl }) => {
    const url = new URL(formUrl);
    const result = getFormParams(url);

    if(result) {
      const { formId } = result.params;
      const formPage = new FormFillerPage(page);
      await formPage.navigateTo(`${url.protocol}//${url.host}/forms/${formId}`);

      await formPage.clickNextButton();

      expect(page.url()).toContain('page=1');
    } else {
      throw new Error('Invalid form URL');
    }
  });

  test('Back button navigation', async ({ page, formUrl }) => {
    const url = new URL(formUrl);
    const params = new URLSearchParams(url.search);
    params.append('page', '2');
    const result = getFormParams(url);

    if(result) {
      const { formId } = result.params;
      const formPage = new FormFillerPage(page);
      await formPage.navigateTo(`${url.protocol}//${url.host}/forms/${formId}?${params.toString()}`);

      await formPage.clickBackButton();

      expect(page.url()).toContain('page=1');
    } else {
      throw new Error('Invalid form URL');
    }
  });

  test('Verify download', async ({ page, formUrl }) => {
    const url = new URL(formUrl);
    const result = getFormParams(url);

    if(result) {
      const { formId } = result.params;
      const formPage = new FormFillerPage(page);
      await formPage.navigateTo(`${url.protocol}//${url.host}/forms/${formId}`);

      await formPage.updateInputValue('First Name', 'John');
      await formPage.updateInputValue('Middle Name', 'Michael');
      await formPage.updateInputValue('Last Name', 'Doe');

      await formPage.clickNextButton();

      expect(page.url()).toContain('page=1');
      await page.getByRole('link', { name: 'Untitled Page', exact: true }).click();
      await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    } else {
      throw new Error('Invalid form URL');
    }
  });
});
