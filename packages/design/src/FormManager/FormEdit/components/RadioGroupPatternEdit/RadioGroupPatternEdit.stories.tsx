import type { Meta, StoryObj } from '@storybook/react';

import { type RadioGroupPattern } from '@gsa-tts/forms-core';

import { createPatternEditStoryMeta } from '../common/story-helper.js';
import FormEdit from '../../index.js';
import CheckboxPatternEdit from '../CheckboxPatternEdit/CheckboxPatternEdit.js';
import { enLocale as message } from '@gsa-tts/forms-common';
import { expect, userEvent } from '@storybook/test';
import { within } from '@testing-library/react';

const pattern: RadioGroupPattern = {
  id: 'radio-group-1',
  type: 'radio-group',
  data: {
    label: message.patterns.radioGroup.displayName,
    hint: message.patterns.radioGroup.hint,
    options: [
      { label: 'Option 1', id: 'option-1' },
      { label: 'Option 2', id: 'option-2' },
      { label: 'Option 3', id: 'option-3' },
    ],
    required: false,
  },
};

const storyConfig: Meta = {
  title: 'Edit components/RadioGroupPattern',
  ...createPatternEditStoryMeta({
    pattern,
  }),
} as Meta<typeof FormEdit>;
export default storyConfig;

export const Basic: StoryObj<typeof FormEdit> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const updatedLabel = 'Multiple choice update';

    await userEvent.click(
      canvas.getByText(message.patterns.radioGroup.displayName)
    );
    const input = canvas.getByLabelText(message.patterns.radioGroup.fieldLabel);
    const optionLabel = canvas.getByLabelText('Option 1 label');

    // Enter new text for the field
    await userEvent.clear(input);
    await userEvent.type(input, updatedLabel);
    await userEvent.clear(optionLabel);
    await userEvent.type(optionLabel, 'Yes');

    const form = input?.closest('form');
    /**
     * The <enter> key behavior outside of Storybook submits the form, which commits the pending edit.
     * Here, we want to simulate the <enter> keypress in the story since Storybook manipulates
     * the default behavior and does not register the enter key if it's in the `userEvent.type` function arg.
     */
    form?.requestSubmit();

    await expect(await canvas.findByText(updatedLabel)).toBeInTheDocument();
    await expect(await canvas.findByText('Yes')).toBeVisible();
  },
};

export const AddField: StoryObj<typeof FormEdit> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByText(message.patterns.radioGroup.displayName)
    );

    await userEvent.click(
      canvas.getByRole('button', {
        name: /add option/i,
      })
    );

    await expect(
      await canvas.findByLabelText('Option 4 label')
    ).toBeInTheDocument();
  },
};

export const DeleteField: StoryObj<typeof FormEdit> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByText(message.patterns.radioGroup.displayName)
    );

    await expect(canvas.getByLabelText('Option 2 label')).toBeInTheDocument();

    const option2Element = canvas.getByLabelText('Option 2 label');
    const option2Row = option2Element.closest('div');
    const deleteButton = within(option2Row as HTMLElement).getByRole('button', {
      name: /delete/i,
    });

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    await userEvent.click(deleteButton);

    await new Promise(resolve => setTimeout(resolve, 3000));
    window.confirm = originalConfirm;

    await expect(canvas.getByLabelText('Option 1 label')).toBeInTheDocument();
    await expect(canvas.getByDisplayValue('Option 3')).toBeInTheDocument();
  },
};

export const Error: StoryObj<typeof CheckboxPatternEdit> = {
  play: async ({ canvasElement }) => {
    userEvent.setup();

    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByText(message.patterns.radioGroup.displayName)
    );

    const input = canvas.getByLabelText(message.patterns.radioGroup.fieldLabel);
    const optionLabel = canvas.getByLabelText('Option 1 label');

    // Clear input, remove focus, and wait for error
    await userEvent.clear(input);
    input.blur();

    await expect(
      await canvas.findByText(
        message.patterns.radioGroup.errorTextMustContainChar
      )
    ).toBeInTheDocument();

    /*
      Repopulate the input value since the error text is indistinguishable from
      the error text from the option label below
    */
    await userEvent.type(input, message.patterns.radioGroup.fieldLabel);

    await userEvent.clear(optionLabel);
    optionLabel.blur();

    await expect(
      await canvas.findByText(
        message.patterns.radioGroup.errorTextMustContainChar
      )
    ).toBeInTheDocument();

    await userEvent.clear(input);
    input.blur();
  },
};
