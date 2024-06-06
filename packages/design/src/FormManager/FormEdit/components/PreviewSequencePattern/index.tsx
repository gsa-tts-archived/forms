import React from 'react';

import { type SequenceProps, getPattern } from '@atj/forms';

import { DraggableList } from './DraggableList';
import { useFormManagerStore } from '../../../store';
import { PatternEditComponent } from '../../types';

// TODO: consider merging this component with DraggableList, to clean up
// sematics around how its children are handled.
export const PatternPreviewSequence: PatternEditComponent<
  SequenceProps
> = props => {
  const form = useFormManagerStore(state => state.session.form);
  const updatePattern = useFormManagerStore(state => state.updatePattern);
  const pattern = getPattern(form, props.previewProps._patternId);

  if (!pattern) {
    console.log(
      'Skipping sequence pattern preview: pattern not found.',
      props.previewProps._patternId
    );
    return null;
  }
  /**
   * Here, we assume that we are rendering a "sequence" pattern, and that
   * sequences have no styling of their own. If sequences were to get their
   * own styling (like other components), this component would need to be
   * updated to replicate the styles, or the wrapping structure would need to
   * be updated to ensure that we pass the correct children to DraggableList.
   *
   * In other words, we'd want to render:
   *    const Component = context.components[props.type];
   * ... and then something like:
   *  <Component _patternId={pattern.id} {...pattern}>{props.children}</Component>
   */
  return (
    <DraggableList
      order={pattern.data.patterns}
      updateOrder={order => {
        updatePattern({
          ...pattern,
          data: {
            ...pattern.data,
            patterns: order,
          },
        });
      }}
    >
      {props.previewProps.children}
    </DraggableList>
  );
};
