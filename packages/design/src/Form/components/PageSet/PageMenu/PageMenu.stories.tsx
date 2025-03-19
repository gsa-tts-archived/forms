import type { Meta, StoryObj } from '@storybook/react';

import { PageMenu } from './PageMenu.js';

const meta: Meta<typeof PageMenu> = {
  title: 'patterns/PageSet/PageMenu',
  component: PageMenu,
  tags: ['autodocs'],
};

export default meta;

const pages = [
  {
    selected: false,
    title: 'First page',
    url: '',
    active: false,
  },
  {
    selected: true,
    title: 'Second page',
    url: '',
    active: true,
  },
];

export const Default: StoryObj<typeof PageMenu> = {
  args: {
    pages,
    pageWindow: pages,
  },
};
