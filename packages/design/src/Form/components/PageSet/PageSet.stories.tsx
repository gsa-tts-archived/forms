import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  createTestFormContext,
  createTestSession,
  createTwoPageTwoPatternTestForm,
} from '../../../test-form.js';
import Form from '../../index.js';

const meta: Meta<typeof Form> = {
  title: 'patterns/PageSet',
  component: Form,
  decorators: [
    (Story, args) => {
      const formMethods = useForm<Record<string, string>>();
      return (
        <MemoryRouter initialEntries={['/']}>
          <FormProvider {...formMethods}>
            <Story {...args} />
          </FormProvider>
        </MemoryRouter>
      );
    },
  ],
  tags: ['autodocs'],
};

export default meta;

export const Basic: StoryObj<typeof Form> = {
  args: {
    context: createTestFormContext(),
    session: createTestSession({ form: createTwoPageTwoPatternTestForm() }),
  },
};
