import { createForm, createFormSession, defaultFormConfig } from '@atj/forms';
import { SequencePattern } from '@atj/forms/src/patterns/sequence';
import { InputPattern } from '@atj/forms/src/patterns/input';

import { type FormUIContext } from './Form';
import { defaultPatternComponents } from './Form/components';
import { type FormEditUIContext } from './FormManager/FormEdit/types';
import { defaultPatternEditComponents } from './FormManager/FormEdit/components';

export const createTestForm = () => {
  return createForm(
    {
      title: 'Test form',
      description: 'Test description',
    },
    {
      root: 'root',
      patterns: [
        {
          type: 'sequence',
          id: 'root',
          data: {
            patterns: ['element-1', 'element-2'],
          },
        } satisfies SequencePattern,
        {
          type: 'input',
          id: 'element-1',
          data: {
            label: 'Pattern 1',
            initial: '',
            required: true,
            maxLength: 128,
          },
        } satisfies InputPattern,
        {
          type: 'input',
          id: 'element-2',
          data: {
            label: 'Pattern 2',
            initial: 'test',
            required: true,
            maxLength: 128,
          },
        } satisfies InputPattern,
      ],
    }
  );
};

export const createTestFormConfig = () => {
  return defaultFormConfig;
};

export const createTestPatternComponentMap = () => {
  return defaultPatternComponents;
};

export const createTestFormContext = (): FormUIContext => {
  return {
    config: defaultFormConfig,
    components: defaultPatternComponents,
    uswdsRoot: '/uswds/',
  };
};

export const createTestFormEditContext = (): FormEditUIContext => {
  return {
    config: defaultFormConfig,
    components: defaultPatternComponents,
    editComponents: defaultPatternEditComponents,
    uswdsRoot: `/static/uswds/`,
  };
};

export const createTestSession = () => {
  const form = createTestForm();
  return createFormSession(form);
};
