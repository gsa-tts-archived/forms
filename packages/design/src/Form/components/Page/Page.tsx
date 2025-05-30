import React from 'react';

import { type PageProps } from '@gsa-tts/forms-core';

import { type PatternComponent } from '../../types.js';
import { renderPromptComponents } from '../../form-common.js';

const Page: PatternComponent<PageProps> = props => {
  return <>{renderPromptComponents(props.context, props.childComponents)}</>;
};

export default Page;
