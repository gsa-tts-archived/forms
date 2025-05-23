import React from 'react';
import classNames from 'classnames';
import { useFormContext } from 'react-hook-form';
import { type EmailInputProps } from '@gsa-tts/forms-core';
import { type PatternComponent } from '../../types.js';

const EmailInputPattern: PatternComponent<EmailInputProps> = ({
  emailId,
  label,
  required,
  error,
  hint,
  value,
}) => {
  const { register } = useFormContext();
  const errorId = `input-error-message-${emailId}`;
  const hintId = `input-hint-${emailId}`;
  return (
    <fieldset className="usa-fieldset">
      <div
        className={classNames('usa-form-group margin-top-2', {
          'usa-form-group--error': error,
        })}
      >
        <label
          className={classNames('usa-label', {
            'usa-label--error': error,
          })}
          htmlFor={emailId}
        >
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
        {hint && (
          <div className="usa-hint" id={hintId}>
            {hint}
          </div>
        )}
        {error && (
          <div className="usa-error-message" id={errorId} role="alert">
            {error.message}
          </div>
        )}
        <input
          className={classNames('usa-input usa-input--xl', {
            'usa-input--error': error,
          })}
          id={emailId}
          type="email"
          autoCapitalize="off"
          autoCorrect="off"
          {...register(emailId, { required })}
          defaultValue={value?.email || ''}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
        />
      </div>
    </fieldset>
  );
};

export default EmailInputPattern;
