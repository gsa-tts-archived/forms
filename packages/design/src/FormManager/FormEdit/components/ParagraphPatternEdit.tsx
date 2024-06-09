import classnames from 'classnames';
import React from 'react';

import { PatternId, type ParagraphProps } from '@atj/forms';
import { type ParagraphPattern } from '@atj/forms/src/patterns/paragraph';

import Paragraph from '../../../Form/components/Paragraph';
import { PatternEditComponent } from '../types';

import { PatternEditActions } from './common/PatternEditActions';
import { PatternEditForm } from './common/PatternEditForm';
import { usePatternEditFormContext } from './common/hooks';
import { useFormManagerStore } from '../../store';
import { en as message } from '@atj/common/src/locales/en/app';

const ParagraphPatternEdit: PatternEditComponent<ParagraphProps> = ({
  focus,
  previewProps,
}) => {
  return (
    <>
      {focus ? (
        <PatternEditForm
          pattern={focus.pattern}
          editComponent={<EditComponent patternId={focus.pattern.id} />}
        ></PatternEditForm>
      ) : (
        <Paragraph {...previewProps} />
      )}
    </>
  );
};

const EditComponent = ({ patternId }: { patternId: PatternId }) => {
  const pattern = useFormManagerStore<ParagraphPattern>(
    state => state.session.form.patterns[patternId]
  );
  const { fieldId, getFieldState, register } =
    usePatternEditFormContext<ParagraphPattern>(patternId);
  const text = getFieldState('text');

  const options = ['normal', 'subheading', 'heading'];

  return (
    <div className="grid-row grid-gap-1">
      <div className="tablet:grid-col-12">
        <label
          className={classnames('usa-label', {
            'usa-label--error': text.error,
          })}
          htmlFor={fieldId('text')}
        >
          {message.patterns.paragraph.fieldLabel}
        </label>
        {text.error ? (
          <span className="usa-error-message" role="alert">
            {text.error.message}
          </span>
        ) : null}
        <textarea
          id={fieldId('text')}
          className="usa-textarea bg-primary-lighter text-bold"
          style={{ height: 'unset' }}
          rows={4}
          {...register('text')}
          defaultValue={pattern.data.text}
        ></textarea>
        <label
          className={classnames('usa-label')}
          htmlFor={fieldId('style')}
        >
          Style
        </label>
        <select
          id={fieldId('style')}
          {...register('style')}
          defaultValue={pattern.data.style}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <PatternEditActions />
    </div>
  );
};

export default ParagraphPatternEdit;
