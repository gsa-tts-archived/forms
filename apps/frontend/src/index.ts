import { createAppRoot } from './views/main';

createAppRoot(document.getElementById('root') as HTMLElement, {
  backend: {
    helloWorld: (str: string) => str,
  },
});
