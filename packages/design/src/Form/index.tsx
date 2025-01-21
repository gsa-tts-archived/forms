import deepEqual from 'deep-equal';
import React, { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  createPrompt,
  emptyPrompt,
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
  service: FormService;
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
  service: FormService,
  config: FormConfig,
  sessionDetails: {
    formId: string;
    formRoute: FormRoute;
    sessionId?: string;
  }
) => {
  const [prompt, _setPrompt] = useState<Prompt>(emptyPrompt);
  const setPrompt = (newPrompt: Prompt) => {
    if (!deepEqual(newPrompt, prompt)) {
      _setPrompt(newPrompt);
    }
  };
  const submitFormData = async (formData: Record<string, string>) => {
    const newSessionResult = await service.submitForm(
      sessionDetails.sessionId,
      sessionDetails.formId,
      formData,
      sessionDetails.formRoute
    );
    if (!newSessionResult.success) {
      console.error('Submission failed', newSessionResult.error);
      return;
    }
    const prompt = createPrompt(config, newSessionResult.data.session, {
      validate: true,
    });
    setPrompt(prompt);
  };

  // So the preview view can update the session, regen the prompt.
  // This feels smelly.
  useEffect(() => {
    service.getFormSession(sessionDetails).then(newSessionResult => {
      if (!newSessionResult.success) {
        console.error('Error getting session', newSessionResult.error);
        return;
      }
      const initialPrompt = createPrompt(config, newSessionResult.data.data, {
        validate: true,
      });
      setPrompt(initialPrompt);
    });
  }, [sessionDetails]);

  return { prompt, setPrompt, submitFormData };
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
  sessionDetails,
}: {
  context: FormUIContext;
  session: FormSession;
  onSubmit?: (data: Record<string, string>) => void;
  isPreview?: boolean;
  sessionDetails: {
    formId: string;
    formRoute: FormRoute;
    sessionId?: string;
  };
}) {
  const { prompt, submitFormData } = usePrompt(
    context.service,
    context.config,
    sessionDetails
  );

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
                  onSubmit
                    ? formMethods.handleSubmit(async (formData, event) => {
                        const submitEvent = event?.nativeEvent as
                          | SubmitEvent
                          | undefined;
                        if (submitEvent === undefined) {
                          console.error(
                            "Can't handle submission without event"
                          );
                          return;
                        }
                        if (!context.service) {
                          console.error('Service is undefined');
                          return;
                        }
                        await submitFormData(formData);
                        /*
                        const action = (
                          submitEvent.submitter as HTMLButtonElement
                        )?.value;
                        onSubmit({ ...data, action }); // DO WE NEED THIS?
                        */
                      })
                    : undefined
                }
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
