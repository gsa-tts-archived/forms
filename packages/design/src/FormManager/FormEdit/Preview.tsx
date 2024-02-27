import classNames from 'classnames';
import React, { createContext, useContext } from 'react';

import {
  type FormDefinition,
  type FormElementId,
  type Pattern,
  createFormSession,
} from '@atj/forms';

import Form, {
  type ComponentForPattern,
  type FormElementComponent,
  type FormUIContext,
} from '../../Form';

type PreviewFormProps = {
  uiContext: FormUIContext;
  form: FormDefinition;
};

export const PreviewForm = ({ uiContext, form }: PreviewFormProps) => {
  const previewUiContext: FormUIContext = {
    config: uiContext.config,
    // I think we want to hoist this definition up to a higher level, so we
    // don't have to regenerate it every time we render the form.
    components: createPreviewComponents(uiContext.components),
  };
  console.log('creating session');
  const disposable = createFormSession(form); // nullSession instead?
  return <Form context={previewUiContext} session={disposable}></Form>;
};

const createPreviewComponents = (
  components: ComponentForPattern
): ComponentForPattern => {
  const previewComponents: ComponentForPattern = {};
  // TODO: Create a configurable way to to defined preview components.
  for (const [patternType, Component] of Object.entries(components)) {
    if (patternType === 'sequence') {
      previewComponents[patternType] = Component;
    } else {
      previewComponents[patternType] = createPatternPreviewComponent(Component);
    }
  }
  return previewComponents;
};

type PreviewContextValue = {
  selectedId?: FormElementId | null;
  setSelectedId: (id: FormElementId | null) => void;
};

export const PreviewContext = createContext<PreviewContextValue>(
  null as unknown as PreviewContextValue
);

const createPatternPreviewComponent = (Component: FormElementComponent) => {
  return function PatternPreviewComponent({ prompt }: { prompt: Pattern }) {
    const { selectedId, setSelectedId } = useContext(PreviewContext);

    const handleEditClick = () => {
      if (selectedId === prompt._elementId) {
          setSelectedId(null); 
      } else {
          setSelectedId(prompt._elementId);
      }
  };

    const isSelected = selectedId === prompt._elementId;
    const divClassNames = isSelected ? 'form-group-row field-selected' : 'form-group-row';

    // console.log("Current Selected ID:", selectedId); 
    // console.log("Prompt ID:", prompt); 

    // console.log("setSelectedId : ", setSelectedId ); 
    // console.log("Is Selected:", isSelected); 
    // console.log("Class Names:", divClassNames); 
    const staticRoot = "/@fs/Users/npierrelouis/Documents/Git Repos/atj-platform/packages/design/";
    return (
      <div
        onClick={handleEditClick}
        className={divClassNames}
        //onKeyDown={handleKeyDown}
        role="button"
        aria-pressed={isSelected}
        aria-label="Select this pattern"
        tabIndex={0}
      >
        <Component prompt={prompt} />
        <span className="edit-button-icon">
          <a className="usa-link" 
            href="javascript:void(0);"
            title="Click to edit">
            <svg
              className="usa-icon"
              aria-label="Click here to edit form group"
              focusable="false"
              role="img"
            >
                <title>Edit form group</title>
                <desc>Click here to edit form group</desc>
              <use
                xlinkHref={`${staticRoot}static1/uswds/img/sprite.svg#settings`}
              ></use>
            </svg>
          </a>

        </span>
      </div>
    );
  };
};
