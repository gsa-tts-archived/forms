import deepEqual from 'deep-equal';
import React, { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  applyPromptResponse,
  createPrompt,
  FormService,
  type FormConfig,
  type FormRoute,
  type FormSession,
  type PatternProps,
  type Prompt,
  type PromptComponent,
} from '@atj/forms';
import { renderPromptComponents } from './form-common.js';
// import { getFormSession } from '../../../forms/dist/types/services/get-form-session.js';
// import { getFormSession } from '../../../forms/dist/types/repository/get-form-session.js';

export type FormUIContext = {
  config: FormConfig;
  components: ComponentForPattern;
  uswdsRoot: `${string}/`;
  service?: FormService;
  // sessionId?: string;
};

export type ComponentForPattern<T extends PatternProps = PatternProps> = Record<
  string,
  PatternComponent<T>
>;

export type PatternComponent<T extends PatternProps = PatternProps<unknown>> =
  React.ComponentType<
    T & {
      context: FormUIContext;
      childComponents?: PromptComponent[];
    }
  >;

const usePrompt = (
  initialPrompt: Prompt,
  config: FormConfig,
  session: FormSession
) => {
  const [prompt, _setPrompt] = useState<Prompt>(initialPrompt);
  const setPrompt = (newPrompt: Prompt) => {
    if (!deepEqual(newPrompt, prompt)) {
      _setPrompt(newPrompt);
    }
  };
  const updatePrompt = (data: Record<string, string>) => {
    const result = applyPromptResponse(config, session, {
      action: 'submit',
      data,
    });
    if (!result.success) {
      console.warn('Error applying prompt response...', result.error);
      return;
    }
    const prompt = createPrompt(config, result.data, { validate: true });
    setPrompt(prompt);
  };
  return { prompt, setPrompt, updatePrompt };
};

// const updateSession = (session: FormSession, data: Record<string, string>) => {
//   const newSession = await context.service.submitForm(
//     session.form.id,
//     data.id,
//     session.form.blueprint
//   );
//   return newSession;
// };

const getRouteUrl = (route?: FormRoute) => {
  if (!route) {
    return '';
  } else {
    const queryString = new URLSearchParams(
      route.params as Record<string, string>
    ).toString();
    return `${route.url}?${queryString}`;
  }
};

export default function Form({
  context,
  session,
  onSubmit,
  isPreview, // ideally this should be removed. just here now for the FFP demo
  sessionId,
}: {
  context: FormUIContext;
  session: FormSession;
  onSubmit?: (data: Record<string, string>) => void;
  isPreview?: boolean;
  sessionId?: string;
}) {
  const initialPrompt = createPrompt(context.config, session, {
    validate: false,
  });
  const { prompt, setPrompt, updatePrompt } = usePrompt(
    initialPrompt,
    context.config,
    session
  );

  // So the preview view can update the session, regen the prompt.
  // This feels smelly.
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const formMethods = useForm<Record<string, string>>({});

  return (
    <FormProvider {...formMethods}>
      <div className="preview grid-container">
        <div className="grid-row">
          <div className="grid-col-12 usa-prose">
            {!isPreview ? (
              <form
                className="usa-form margin-bottom-3 maxw-full"
                encType="multipart/form-data"
                onSubmit={
                  onSubmit ? formMethods.handleSubmit(async (data, event) => {
                  const submitEvent = event?.nativeEvent as
                    | SubmitEvent
                    | undefined;
                  if (submitEvent === undefined) {
                    console.error("Can't handle submission without event");
                    return;
                  }
                  const action = (submitEvent.submitter as HTMLButtonElement)
                    ?.value;
                  if (!context.service) {
                    console.error("Service is undefined");
                    return;
                  }
                  // const sessionId = window.localStorage.getItem('form_session_id');
                  // if (!sessionId) {
                  //   console.error("Form session id not found");
                  //   return;
                  // }

                  // const formSession = await getFormSession(
                  //   context.service.context,
                  //   {
                  //     formId: session.form.id,
                  //     formRoute: session.route,
                  //     sessionId,
                  //   }
                  // );
                  // if (!formSession.success) {
                  //   console.error("Form session not found");
                  //   return;
                  // }
                  // const session = await context.service.getFormSession({
                  //   formId,
                  //   formRoute,
                  //   sessionId,
                  // });

                  // const formData = {
                  //   ...data,
                  //   action,
                  // };

                  const newSessionResult = await context.service.submitForm(
                    sessionId,
                    data.id,
                    data,
                    session.route,
                  );

                  if (!newSessionResult.success) {
                    console.error("Submission failed", newSessionResult.error);
                    return;
                  }
                  const prompt = createPrompt(context.config, newSessionResult.data.session, {
                    validate: true,
                  });
                  const promptAsRecord: Record<string, string> = {
                    ...prompt,
                    components: JSON.stringify(prompt.components)
                  };
                  updatePrompt(promptAsRecord);
                  onSubmit({ ...data, action }); // DO WE NEED THIS?
                }) : undefined}
                method="POST"
                action={getRouteUrl(session.route)}
                aria-label={session.form.summary.title || 'Form'}
              >
                <FormContents context={context} prompt={prompt} />
              </form>
            ) : (
              <div className="formContentWrapper">
                <FormContents context={context} prompt={prompt} />
              </div>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

const FormContents = ({
  context,
  prompt,
}: {
  context: FormUIContext;
  prompt: Prompt;
}) => {
  return (
    <>
      <fieldset className="usa-fieldset width-full">
        {renderPromptComponents(context, prompt.components)}
      </fieldset>
    </>
  );
};
