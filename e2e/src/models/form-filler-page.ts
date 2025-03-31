import { Page } from '@playwright/test';

export class FormFillerPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(url: string) {
    await this.page.goto(url);
  }

  async clickNextButton() {
    const nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
    await nextButton.click();
  }

  async clickBackButton() {
    const backButton = this.page.getByRole('link', { name: 'Back', exact: true });
    await backButton.click();
  }

  async getInput(role, matcher) {
    return this.page.getByRole(role, matcher);
  }

  async updateInputValue(role, matcher, value) {
    const input = await this.getInput(role, matcher);
    await input.first().fill(value);
  }

}