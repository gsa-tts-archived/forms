import { test, expect } from './fixtures/import-file.fixture.js';
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

      const nameFieldset = page.getByRole('group', { name: 'Name', exact: true })
      await formPage.editFieldsetInput(nameFieldset, 'First Name', 'John');
      await formPage.editFieldsetInput(nameFieldset, 'Middle Name', 'Michael');
      await formPage.editFieldsetInput(nameFieldset, 'Last Name', 'Doe');

      const previousNameFieldset = page.getByRole('group', { name: 'Name at Conviction (if' });
      await formPage.editFieldsetInput(previousNameFieldset, 'First Name', 'John');
      await formPage.editFieldsetInput(previousNameFieldset, 'Middle Name', 'Harold');
      await formPage.editFieldsetInput(previousNameFieldset, 'Last Name', 'Doe');

      await formPage.clickNextButton();
      await formPage.clickNextButton();
      await formPage.clickNextButton();
      await formPage.clickNextButton();
      await formPage.clickNextButton();

      expect(page.url()).toContain('page=5');
    } else {
      throw new Error('Invalid form URL');
    }
  });
});
