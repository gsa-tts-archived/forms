import { describe, expect, it } from 'vitest';
import { checkboxGroupConfig, type CheckboxGroupPattern } from './index.js';

describe('CheckboxGroupPattern tests', () => {
  describe('checkboxGroupConfig', () => {
    it('should parse user input correctly when options are selected', () => {
      const pattern: CheckboxGroupPattern = {
        type: 'checkbox-group',
        id: 'test',
        data: {
          label: 'Test Checkbox Group',
          hint: 'Select your options',
          options: [
            { id: 'option-1', label: 'Option 1' },
            { id: 'option-2', label: 'Option 2' },
          ],
          required: true,
        },
      };

      const inputValue = { 'option-1': 'option-1', 'option-2': 'option-2' };
      const result = checkboxGroupConfig.parseUserInput!(pattern, inputValue);
      if (result.success) {
        expect(result.data).toEqual(['option-1', 'option-2']);
      } else {
        expect.fail('Unexpected validation failure');
      }
    });

    it('should handle validation error when no options are selected', () => {
      const pattern: CheckboxGroupPattern = {
        type: 'checkbox-group',
        id: 'test',
        data: {
          label: 'Test Checkbox Group',
          hint: 'Select your options',
          options: [
            { id: 'option-1', label: 'Option 1' },
            { id: 'option-2', label: 'Option 2' },
          ],
          required: true,
        },
      };

      const inputValue = undefined;
      const result = checkboxGroupConfig.parseUserInput!(pattern, inputValue);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe(
          'No options selected for checkbox group'
        );
      } else {
        expect.fail('Unexpected validation success');
      }
    });

    it('should parse config data correctly', () => {
      const obj = {
        label: 'Test Checkbox Group',
        hint: 'Select your options',
        options: [
          { id: 'option-1', label: 'Option 1' },
          { id: 'option-2', label: 'Option 2' },
        ],
        required: true,
      };

      const result = checkboxGroupConfig.parseConfigData(obj);
      if (result.success) {
        expect(result.data.label).toBe('Test Checkbox Group');
        expect(result.data.required).toBe(true);
        expect(result.data.hint).toBe('Select your options');
      } else {
        expect.fail('Unexpected validation failure');
      }
    });

    it('should handle invalid config data', () => {
      const obj = {
        label: '',
        hint: '',
        options: [],
        required: true,
      };

      const result = checkboxGroupConfig.parseConfigData(obj);
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        expect.fail('Unexpected validation success');
      }
    });
  });
});
