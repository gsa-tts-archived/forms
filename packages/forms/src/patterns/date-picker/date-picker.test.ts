import { describe, expect, it } from 'vitest';
import {
  createDatePickerSchema,
  datePickerConfig,
  type DatePickerPattern,
} from './date-picker.js';

describe('DatePickerPattern tests', () => {
  describe('createDatePickerSchema', () => {
    it('should create schema for required date picker', () => {
      const data: DatePickerPattern['data'] = {
        label: 'Test Label',
        required: true,
        hint: 'Enter your date',
      };

      const schema = createDatePickerSchema(data);
      const validInput = { month: '03', day: '15', year: '1990' };
      const invalidInput = { month: '13', day: '32', year: '199x' };

      expect(schema.safeParse(validInput).success).toBe(true);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should create schema for optional date', () => {
      const data: DatePickerPattern['data'] = {
        label: 'Test Label',
        required: false,
        hint: 'Enter your date',
      };

      const schema = createDatePickerSchema(data);
      const validInput = { month: '03', day: '15', year: '1990' };
      const emptyInput = {};

      expect(schema.safeParse(validInput).success).toBe(true);
      expect(schema.safeParse(emptyInput).success).toBe(true);
    });
  });

  describe('datePickerConfig', () => {
    it('should parse user input correctly', () => {
      const pattern: DatePickerPattern = {
        type: 'date-picker',
        id: 'test',
        data: {
          label: 'Test Date label',
          required: true,
          hint: 'Enter your date',
        },
      };

      const inputValue = { month: '03', day: '15', year: '1990' };
      if (!datePickerConfig.parseUserInput) {
        expect.fail('datePickerConfig.parseUserInput is not undefined');
      }
      const result = datePickerConfig.parseUserInput(pattern, inputValue);
      if (result.success) {
        expect(result.data).toEqual(inputValue);
      } else {
        expect.fail('Unexpected validation failure');
      }
    });

    it('should handle validation error for user input', () => {
      const pattern: DatePickerPattern = {
        type: 'date-picker',
        id: 'test',
        data: {
          label: 'Test Date label',
          required: true,
          hint: 'Enter your date',
        },
      };

      const inputValue = { month: '13', day: '32', year: '199x' };
      if (!datePickerConfig.parseUserInput) {
        expect.fail('datePickerConfig.parseUserInput is not undefined');
      }
      const result = datePickerConfig.parseUserInput(pattern, inputValue);
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        expect.fail('Unexpected validation success');
      }
    });

    it('should parse config data correctly', () => {
      const obj = {
        label: 'Test Date label',
        required: true,
        hint: 'Enter your date',
      };

      if (!datePickerConfig.parseConfigData) {
        expect.fail('datePickerConfig.parseConfigData is not undefined');
      }
      const result = datePickerConfig.parseConfigData(obj);
      if (result.success) {
        expect(result.data.label).toBe('Test Date label');
        expect(result.data.required).toBe(true);
        expect(result.data.hint).toBe('Enter your date');
      } else {
        expect.fail('Unexpected validation failure');
      }
    });

    it('should handle invalid config data', () => {
      const obj = {
        label: '',
        required: true,
        hint: '',
      };

      if (!datePickerConfig.parseConfigData) {
        expect.fail('datePickerConfig.parseConfigData is not undefined');
      }
      const result = datePickerConfig.parseConfigData(obj);
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        expect.fail('Unexpected validation success');
      }
    });
  });
});
