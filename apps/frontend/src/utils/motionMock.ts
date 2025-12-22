// Mock framer-motion components for development without the dependency
import React from 'react';

export const motion = {
  div: ({ children, ...props }: any) => React.createElement('div', props, children),
  span: ({ children, ...props }: any) => React.createElement('span', props, children),
  button: ({ children, ...props }: any) => React.createElement('button', props, children),
  section: ({ children, ...props }: any) => React.createElement('section', props, children),
  header: ({ children, ...props }: any) => React.createElement('header', props, children),
  nav: ({ children, ...props }: any) => React.createElement('nav', props, children),
  main: ({ children, ...props }: any) => React.createElement('main', props, children),
  form: ({ children, ...props }: any) => React.createElement('form', props, children),
  ul: ({ children, ...props }: any) => React.createElement('ul', props, children),
  li: ({ children, ...props }: any) => React.createElement('li', props, children),
  h1: ({ children, ...props }: any) => React.createElement('h1', props, children),
  h2: ({ children, ...props }: any) => React.createElement('h2', props, children),
  h3: ({ children, ...props }: any) => React.createElement('h3', props, children),
  p: ({ children, ...props }: any) => React.createElement('p', props, children),
  a: ({ children, ...props }: any) => React.createElement('a', props, children),
  img: ({ children, ...props }: any) => React.createElement('img', props, children),
};

export const AnimatePresence = ({ children }: { children: React.ReactNode }) => children;

export const useAnimation = () => ({
  start: () => Promise.resolve(),
  set: () => {},
});

export const useInView = () => [false, () => {}];

export const useScroll = () => ({ scrollY: { get: () => 0 } });

export const useTransform = () => 0;

export const useSpring = () => 0;