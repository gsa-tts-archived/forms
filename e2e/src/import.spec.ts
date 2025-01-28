import { test, expect } from './fixtures/import-file.fixture.js';
import { FormCreatePage } from './models/form-create-page.js';

test.describe('Import form from a provided sample', () => {
  test('Verify the form import was successful', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    await formPage.verifyBlueprintLoaded();
  });

  test('Edit page title', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    await formPage.editPageTitle('Pardon Application *', 'My awesome form page');
  });

  test('Add a rich text component and format text', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    const editorText = 'This is some text entered in the rich text editor';
    await formPage.navigateTo(formUrl);
    await formPage.addRichTextComponent(editorText);
  });

  test('Move question to another page', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    const destinationPage = 'Charge Details';
    await formPage.navigateTo(`${formUrl}?page=8`);
    await formPage.moveQuestionToPage('Race', destinationPage);
    await expect(page.getByText('Element moved successfully.')).toBeVisible();
    await formPage.navigateTo(`${formUrl}?page=4`);
    await formPage.keyboardEnter();
    expect(page.getByText('Name:')).toBeDefined();
  });

  test('Delete a question/pattern', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(`${formUrl}?page=11`);
    await formPage.confirmDialog();
    await formPage.deletePattern('Page 3 of 4');
  });

  test('Add a new page with a package download component', async ({ page, formUrl }) => {
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    await formPage.addPageWithPackageDownload('Download your documents');
  });

  test('Reorder pages via drag and drop', async ({ page, formUrl }) => {
    const getPageMenuLinks = (links: (SVGElement | HTMLElement)[]) => links.map((link) => link.textContent?.trim() || '');
    const formPage = new FormCreatePage(page);
    await formPage.navigateTo(formUrl);
    const menuSelector = 'ul.add-list-reset a';
    const startOrder = await page.$$eval(menuSelector, getPageMenuLinks);
    await formPage.moveListItem('Move this item', startOrder);
    const endOrder = await page.$$eval(menuSelector, getPageMenuLinks);

    expect(startOrder).not.toEqual(endOrder);
  });
});
