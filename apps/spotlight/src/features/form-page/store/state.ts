import { type FormRoute } from '@atj/forms';
import { type FormSessionResponse } from './actions/get-form-session.js';

export type FormPageState = {
  formId: string;
  formRoute: FormRoute;
  formSessionResponse: FormSessionResponse;
};

export const getInitialState = (): FormPageState => ({
  formId: '',
  formRoute: {
    url: '',
    params: {},
  },
  formSessionResponse: { status: 'loading' },
});
