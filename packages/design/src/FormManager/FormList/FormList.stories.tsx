import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react';

import { createTestBrowserFormService } from '@gsa-tts/forms-core/context';

import FormList from './index.js';
import {
  createPatternTestForm,
  createTestSession,
  createTestFormManagerContext,
} from '../../test-form.js';
import { FormManagerProvider } from '../store.js';

const meta: Meta<typeof FormList> = {
  title: 'FormManager/FormList',
  component: FormList,
  decorators: [
    (Story, args) => (
      <MemoryRouter initialEntries={['/']}>
        <FormManagerProvider
          context={createTestFormManagerContext()}
          session={createTestSession({ form: createPatternTestForm({
            useSequence: true,
            patternCount: 2,
            requiredInputs: true,
          })
        })}
        >
          <Story {...args} />
        </FormManagerProvider>
      </MemoryRouter>
    ),
  ],
  args: {
    formService: createTestBrowserFormService({
      'test-form': createPatternTestForm({
        useSequence: true,
        patternCount: 2,
        requiredInputs: true,
      }),
    }),
  },
  tags: ['autodocs'],
};

export default meta;
export const FormListFilled = {} satisfies StoryObj<typeof FormList>;
