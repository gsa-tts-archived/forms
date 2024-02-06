import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import Form from '.';
import { createTestForm } from '../test-form';

export default {
  title: 'Form',
  component: Form,
  decorators: [(Story, args) => <Story {...args} />],
  args: {
    form: createTestForm(),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Form>;

export const FormTest = {} satisfies StoryObj<typeof Form>;
