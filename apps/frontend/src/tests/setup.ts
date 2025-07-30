import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom/vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-object-url'),
});

// Mock URL.revokeObjectURL
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
});

// Mock file reader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  abort: vi.fn(),
  result: null,
  error: null,
  readyState: 0,
}));

// Mock alert, confirm, prompt
global.alert = vi.fn();
global.confirm = vi.fn();
global.prompt = vi.fn();

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

export {};