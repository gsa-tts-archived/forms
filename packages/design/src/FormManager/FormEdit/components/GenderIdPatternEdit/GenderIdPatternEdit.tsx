import classnames from 'classnames';
import React from 'react';

import { type GenderIdProps } from '@gsa-tts/forms-core';
import { type GenderIdPattern } from '@gsa-tts/forms-core';

import GenderId from '../../../../Form/components/GenderId/GenderId.js';
import { PatternEditComponent } from '../../types.js';

import { PatternEditActions } from '../common/PatternEditActions.js';
import { PatternEditForm } from '../common/PatternEditForm.js';
import { usePatternEditFormContext } from '../common/hooks.js';
import { enLocale as message } from '@gsa-tts/forms-common';
import styles from '../../formEditStyles.module.css';

const GenderIdPatternEdit: PatternEditComponent<GenderIdProps> = ({
  context,
  focus,
  previewProps,
}) => {
  return (
    <>
      {focus ? (
        <PatternEditForm
          pattern={focus.pattern}
          editComponent={<EditComponent pattern={focus.pattern} />}
        ></PatternEditForm>
      ) : (
        <div
          className={`${styles.genderIdPattern} padding-left-3 padding-bottom-3 padding-right-3`}
        >
          <GenderId context={context} {...previewProps} />
        </div>
      )}
    </>
  );
};

const EditComponent = ({ pattern }: { pattern: GenderIdPattern }) => {
  const { fieldId, getFieldState, register } =
    usePatternEditFormContext<GenderIdPattern>(pattern.id);
  const label = getFieldState('label');
  const hint = getFieldState('hint');
  const preferNotToAnswerText = getFieldState('preferNotToAnswerText');

  return (
    <div className="grid-row grid-gap">
      <div className="grid-col-12 margin-bottom-2">
        <label
          className={classnames('usa-label', {
            'usa-label--error': label.error,
          })}
        >
          {message.patterns.genderId.fieldLabel}
          {label.error ? (
            <span className="usa-error-message" role="alert">
              {label.error.message}
            </span>
          ) : null}
          <input
            className="usa-input bg-primary-lighter"
            id={fieldId('label')}
            defaultValue={pattern.data.label}
            {...register('label')}
            type="text"
            autoFocus
          />
        </label>
      </div>
      <div className="grid-col-12 margin-bottom-2">
        <label
          className={classnames('usa-label', {
            'usa-label--error': hint.error,
          })}
        >
          <span className={`${styles.secondaryColor}`}>
            {message.patterns.genderId.hintLabel}
          </span>
          {hint.error ? (
            <span className="usa-error-message" role="alert">
              {hint.error.message}
            </span>
          ) : null}
          <input
            className="usa-input bg-primary-lighter"
            id={fieldId('hint')}
            defaultValue={pattern.data.hint}
            {...register('hint')}
            type="text"
          />
        </label>
      </div>
      <div className="grid-col-12 margin-bottom-2">
        <label
          className={classnames('usa-label', {
            'usa-label--error': preferNotToAnswerText.error,
          })}
        >
          {message.patterns.genderId.preferNotToAnswerTextLabel}
          {preferNotToAnswerText.error ? (
            <span className="usa-error-message" role="alert">
              {preferNotToAnswerText.error.message}
            </span>
          ) : null}
          <input
            className="usa-input bg-primary-lighter"
            id={fieldId('preferNotToAnswerText')}
            defaultValue={''}
            {...register('preferNotToAnswerText')}
            type="text"
          />
        </label>
      </div>
      <div className="grid-col-12">
        <PatternEditActions>
          <span className="usa-checkbox">
            <input
              style={{ display: 'inline-block' }}
              className="usa-checkbox__input bg-primary-lighter"
              type="checkbox"
              id={fieldId('required')}
              {...register('required')}
              defaultChecked={pattern.data.required}
            />
            <label
              style={{ display: 'inline-block' }}
              className="usa-checkbox__label"
              htmlFor={fieldId('required')}
            >
              Required
            </label>
          </span>
        </PatternEditActions>
      </div>
    </div>
  );
};

export default GenderIdPatternEdit;
