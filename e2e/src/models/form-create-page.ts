import { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures/import-file.fixture.js';
import { enLocale as message } from '@atj/common';

export class FormCreatePage {
  private readonly page: Page;
  private readonly blueprintLoadedText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.blueprintLoadedText = this.page.getByText('Blueprint loaded');
  }

  async navigateTo(url: string) {
    await this.page.goto(url);
  }

  async verifyBlueprintLoaded() {
    await expect(this.blueprintLoadedText).toBeVisible();
  }

  async editPageTitle(oldTitle: string, newTitle: string) {
    await this.page.getByText(oldTitle).click();
    const titleInput = this.page.getByLabel('Page title');
    await titleInput.fill(newTitle);
    await this.page.getByRole('button', { name: 'Save and Close' }).click();
    await expect(
      this.page.getByRole('link', { name: newTitle })
    ).toBeVisible();
  }

  async addRichTextComponent(editorText: string) {
    await this.page.locator('.usa-sidenav').first().waitFor();
    const menuButton = this.page.getByRole('button', { name: 'Question', exact: true });
    await menuButton.click();
    await this.page
      .getByRole('button', { name: message.patterns.richText.displayName })
      .click();
    const editor = this.page.locator('div[contenteditable="true"]');
    await editor.fill(editorText);
    await this.page.getByRole('button', { name: 'Heading', exact: true }).click();
    await this.page.getByRole('button', { name: 'Save and Close', exact: true }).click();
    expect(
      this.page.getByRole('heading', { name: editorText })
    ).toBeDefined();
  }

  async moveQuestionToPage(destinationPage: string) {
    await this.page.getByText('Name:').click();
    await this.page.getByRole('button', { name: 'Move questions' }).click();
    await this.page.getByLabel('Page:').selectOption(destinationPage);
    await this.page.getByLabel('Position:').selectOption('top');
    await this.page
      .getByRole('button', { name: 'Move these questions to another page' })
      .click();
  }

  async keyboardEnter() {
    await this.page.keyboard.press('Enter');
  }

  async confirmDialog() {
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  }

  async deletePattern(patternText: string) {
    const pattern = this.page.getByText(patternText);
    await pattern.click();
    await this.page
      .getByRole('button', { name: 'Delete this pattern' })
      .click();
    await expect(pattern).not.toBeVisible();
  }

  async addPageWithPackageDownload(label: string) {
    await this.page.getByRole('button', { name: 'Page' }).click();
    await this.page.getByRole('link', { name: 'Untitled Page' }).click();
    await this.page.getByRole('button', { name: 'Question', exact: true }).click();
    await this.page
      .getByRole('button', { name: message.patterns.packageDownload.displayName })
      .click();
    await this.page
      .getByLabel(message.patterns.packageDownload.fieldLabel)
      .fill(label);
    await this.page.getByRole('button', { name: 'Save and Close' }).click();
    await expect(
      this.page.getByRole('button', { name: 'Download PDF' })
    ).toBeVisible();
  }
}