import { test, expect } from './fixtures/import-file.fixture.js';
import { FormCreatePage } from './models/form-create-page.js';

// Reorder pages via drag and drop

test.describe('Import form from a provided sample', () => {
  test('Verify the form import was successful', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    await formPage.verifyBlueprintLoaded();
  });

  test('Edit page title', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    await formPage.editPageTitle('0 *', 'My awesome form page');
  });

  test('Add a rich text component and format text', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    const editorText = 'This is some text entered in the rich text editor';
    await formPage.navigateTo(formUrl);
    await formPage.addRichTextComponent(editorText);
  });

  test('Move question to another page', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    const destinationPage = '1';
    await formPage.navigateTo(`${formUrl}?page=2`);
    await formPage.moveQuestionToPage(destinationPage);
    await expect(page.getByText('Element moved successfully.')).toBeVisible();
    await formPage.navigateTo(`${formUrl}?page=${destinationPage}`);
    await formPage.keyboardEnter();
    expect(page.getByText('Name:')).toBeDefined();
  });

  test('Delete a question/pattern', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(`${formUrl}?page=2`);
    await formPage.confirmDialog();
    await formPage.deletePattern('(state) (docket number) United States');
  });

  test('Add a new page with a package download component', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    await formPage.addPageWithPackageDownload('Download your documents');
  });
});
