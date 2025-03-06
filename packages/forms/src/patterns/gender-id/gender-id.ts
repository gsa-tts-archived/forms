import * as z from 'zod';
import { type GenderIdProps } from '../../components.js';
import { type Pattern, type PatternConfig } from '../../pattern.js';
import { getFormSessionError, getFormSessionValue } from '../../session.js';
import {
  safeZodParseFormErrors,
  safeZodParseToFormError,
} from '../../util/zod.js';

const configSchema = z.object({
  label: z.string().min(1),
  required: z.boolean(),
  hint: z.string().optional(),
  preferNotToAnswerText: z.string().optional(),
});

export type GenderIdPattern = Pattern<z.infer<typeof configSchema>>;

export type GenderIdPatternOutput = z.infer<
  ReturnType<typeof createGenderIdSchema>
>;

export const createGenderIdSchema = (data: GenderIdPattern['data']) => {
  return z
    .object({
      gender: z.string().optional(),
      preferNotToAnswer: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      const { gender, preferNotToAnswer } = value;

      if (
        data.required &&
        !gender?.trim() &&
        preferNotToAnswer !== data.preferNotToAnswerText
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'This field is required',
        });
        return;
      }
    });
};

export const genderIdConfig: PatternConfig<
  GenderIdPattern,
  GenderIdPatternOutput
> = {
  displayName: 'Gender identity',
  iconPath: 'gender-id-icon.svg',
  initial: {
    label: 'Gender identity',
    required: false,
    hint: 'For example, man, woman, non-binary',
    preferNotToAnswerText: 'Prefer not to share my gender identity',
  },

  parseUserInput: (pattern, inputValue) => {
    const result = safeZodParseToFormError(
      createGenderIdSchema(pattern.data),
      inputValue
    );
    return result;
  },

  parseConfigData: obj => {
    return safeZodParseFormErrors(configSchema, obj);
  },
  getChildren() {
    return [];
  },

  createPrompt(_, session, pattern, options) {
    const sessionValue = getFormSessionValue(session, pattern.id);
    const sessionError = getFormSessionError(session, pattern.id);

    const preferNotToAnswerChecked =
      sessionValue?.preferNotToAnswer === pattern.data.preferNotToAnswerText;

    return {
      props: {
        _patternId: pattern.id,
        type: 'gender-id',
        label: pattern.data.label,
        genderId: pattern.id,
        required: pattern.data.required,
        hint: pattern.data.hint,
        preferNotToAnswerText: pattern.data.preferNotToAnswerText,
        preferNotToAnswerChecked,
        value: sessionValue,
        error: sessionError,
      } as GenderIdProps,
      children: [],
    };
  },
};
