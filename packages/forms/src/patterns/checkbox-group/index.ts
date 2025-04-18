import * as z from 'zod';

import { type CheckboxGroupProps } from '../../components.js';
import { type Pattern, type PatternConfig } from '../../pattern.js';
import { getFormSessionError, getFormSessionValue } from '../../session.js';
import { safeZodParseFormErrors } from '../../util/zod.js';

const configSchema = z.object({
  label: z.string().min(1),
  hint: z.string().optional(),
  required: z.boolean(),
  options: z
    .object({
      id: z.string().regex(/^[A-Za-z][A-Za-z0-9\-_:.]*$/, 'Invalid Option ID'),
      label: z.string().min(1),
    })
    .array(),
});
export type CheckboxGroupPattern = Pattern<z.infer<typeof configSchema>>;

const PatternOutput = z.array(z.string());
type PatternOutput = z.infer<typeof PatternOutput>;

export const checkboxGroupConfig: PatternConfig<
  CheckboxGroupPattern,
  PatternOutput
> = {
  displayName: 'Checkbox group',
  iconPath: 'checkbox-group-icon.svg',
  initial: {
    label: 'Question text',
    hint: '',
    options: [
      { id: 'option-1', label: 'Option 1' },
      { id: 'option-2', label: 'Option 2' },
    ],
    required: false,
  },
  parseUserInput: (pattern, input) => {
    if (typeof input === 'object') {
      const selectedOptions = Object.keys(input).filter(
        key => input[key] === key
      );
      return {
        success: true,
        data: selectedOptions,
      };
    }

    if (pattern.data.required) {
      return {
        success: false,
        error: {
          type: 'custom',
          message: 'No options selected for checkbox group',
        },
      };
    }

    return {
      success: true,
      data: [],
    };
  },

  parseConfigData: obj => {
    const result = safeZodParseFormErrors(configSchema, obj);
    return result;
  },
  getChildren() {
    return [];
  },
  createPrompt(_, session, pattern, options) {
    const sessionValue = getFormSessionValue(session, pattern.id) || [];
    const sessionError = getFormSessionError(session, pattern.id);

    return {
      props: {
        _patternId: pattern.id,
        type: 'checkbox-group',
        groupId: pattern.id,
        label: pattern.data.label,
        hint: pattern.data.hint,
        options: pattern.data.options.map(option => {
          return {
            id: option.id,
            name: pattern.id,
            label: option.label,
            defaultChecked: sessionValue.includes(option.id),
            disabled: false,
          };
        }),
        error: sessionError,
        required: pattern.data.required,
      } as CheckboxGroupProps,
      children: [],
    };
  },
};
