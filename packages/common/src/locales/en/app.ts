const defaults = {
  defaultFieldValue: 'Default field value',
  fieldLabel: 'Field label',
  fieldLabelRequired: 'A field label is required',
  fieldRequired: 'This field is required',
};

export const en = {
  patterns: {
    address: {
      ...defaults,
      displayName: 'Address',
      fieldLabel: 'Question text',
      legend: 'Physical address',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    attachment: {
      ...defaults,
      displayName: 'Attachment',
      fieldLabel: 'Question text',
      maxAttachmentsLabel: 'Max attachments',
      allowedFileTypesLabel: 'Allowable file types',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
      errorUnsupportedFileType: 'Invalid file type found.',
    },
    checkbox: {
      ...defaults,
      displayName: 'Checkbox',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    fieldset: {
      ...defaults,
      displayName: 'Question set',
      hintLabel: 'Hint Text (optional)',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    input: {
      ...defaults,
      displayName: 'Short answer',
      maxLength: 'Maximum length',
    },
    textarea: {
      ...defaults,
      displayName: 'Long answer',
      maxLength: 'Maximum length',
      hintLabel: 'Hint Text (optional)',
      hint: 'The more specific you can be, the better. Use the space below and/or attach additional pages.',
    },
    packageDownload: {
      ...defaults,
      displayName: 'Package download',
      fieldLabel: 'Package download label',
    },
    page: {
      fieldLabel: 'Page title',
    },
    paragraph: {
      fieldLabel: 'Paragraph text',
      displayName: 'Paragraph',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    richText: {
      fieldLabel: 'Page text',
      displayName: 'Page text',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    radioGroup: {
      ...defaults,
      displayName: 'Multiple choice question label',
      fieldLabel: 'Question text',
      hintLabel: 'Hint Text (optional)',
      hint: '',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    selectDropdown: {
      ...defaults,
      displayName: 'Question text',
      fieldLabel: 'Question text',
      hintLabel: 'Hint Text (optional)',
      hint: '',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    dateOfBirth: {
      ...defaults,
      displayName: 'Date of birth',
      fieldLabel: 'Question text',
      hintLabel: 'Hint text (optional)',
      hint: 'For example: January 19 2000',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    emailInput: {
      ...defaults,
      displayName: 'Email address',
      fieldLabel: 'Question text',
      hintLabel: 'Hint text (optional)',
      hint: 'Enter an email address without spaces using this format: email@domain.com',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    nameInput: {
      ...defaults,
      displayName: 'Name',
      fieldLabel: 'Question text',
      givenNameHint: 'First or given name hint text (optional)',
      familyNameHint: 'Last or family name hint text (optional)',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    phoneNumber: {
      ...defaults,
      displayName: 'Phone number',
      fieldLabel: 'Question text',
      hintLabel: 'Hint text (optional)',
      hint: '10-digit, U.S. only, for example 999-999-9999',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    ssn: {
      ...defaults,
      displayName: 'Social Security number',
      fieldLabel: 'Question text',
      hintLabel: 'Hint text (optional)',
      hint: 'For example, 555-11-0000',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    genderId: {
      // deprecated
      ...defaults,
      displayName: 'Gender identity',
      fieldLabel: 'Question text',
      hintLabel: 'Hint text (optional)',
      hint: 'For example, man, woman, non-binary',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
      preferNotToAnswerTextLabel:
        'Prefer not to share my gender identity checkbox label',
    },
    sex: {
      ...defaults,
      displayName: 'Sex',
      fieldLabel: 'Question text',
      helperTextLabel: 'Helper text',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
    repeater: {
      ...defaults,
      displayName: 'Repeatable Group',
      hintLabel: 'Hint Text (optional)',
      errorTextMustContainChar: 'String must contain at least 1 character(s)',
    },
  },
  controls: {
    addElement: {
      textContent: 'Add element',
    },
  },
};
