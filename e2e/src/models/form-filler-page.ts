import { Locator, Page } from '@playwright/test';

export class FormFillerPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(url: string) {
    await this.page.goto(url);
  }

  async clickNextButton() {
    const nextButton = this.page.getByRole('button', { name: 'Next' });
    await nextButton.click();
  }

  async clickBackButton() {
    const backButton = this.page.getByRole('button', { name: 'Back' });
    await backButton.click();
  }

  async editFieldsetInput(fieldset: Locator, input: string, value: string) {
    await fieldset.getByLabel(input).fill(value);
  }

  async keyboardEnter() {
    await this.page.keyboard.press('Enter');
  }

}