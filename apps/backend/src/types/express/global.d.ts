/// <reference types="node" />

// Explicitly declare Node.js globals to ensure they're available
declare global {
  namespace NodeJS {
    interface Process {
      env: ProcessEnv;
    }
    interface ProcessEnv {
      [key: string]: string | undefined;
      NODE_ENV?: "development" | "production" | "test";
    }
  }

  var process: NodeJS.Process;
  var console: Console;
  var Buffer: BufferConstructor;
  var setTimeout: (
    callback: (...args: any[]) => void,
    ms?: number,
    ...args: any[]
  ) => NodeJS.Timeout;
  var setInterval: (
    callback: (...args: any[]) => void,
    ms?: number,
    ...args: any[]
  ) => NodeJS.Timeout;
  var clearTimeout: (timeoutId: NodeJS.Timeout) => void;
  var clearInterval: (intervalId: NodeJS.Timeout) => void;
}

export {};
