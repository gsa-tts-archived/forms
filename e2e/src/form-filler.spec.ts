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
    const fields = [
      { label: 'First Name', value: 'John' },
      { label: 'Middle Name', value: 'Michael' },
      { label: 'Last Name', value: 'Doe' },
    ];

    if(result) {
      const { formId } = result.params;
      const formPage = new FormFillerPage(page);
      await formPage.navigateTo(`${url.protocol}//${url.host}/forms/${formId}`);

      const isDownloadButtonVisible = async (): Promise<boolean> =>
        await page.getByRole('button', { name: 'Download PDF', exact: true }).isVisible();

      const waitForDownloadButton = async () => {
        let isButtonVisible = await isDownloadButtonVisible();
        while (!isButtonVisible) {
          await formPage.clickNextButton();
          await page.waitForTimeout(500);
          isButtonVisible = await isDownloadButtonVisible();
        }
      };

      for (const { label, value } of fields) {
        await formPage.updateInputValue(label, value);
      }

      await waitForDownloadButton();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(
        'demo-application_for_certificate_of_pardon_for_simple_marijuana_possession.pdf'
      );

    } else {
      throw new Error('Invalid form URL');
    }
  });
});
