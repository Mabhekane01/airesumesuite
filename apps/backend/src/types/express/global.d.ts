/// <reference types="node" />

declare global {
  var process: NodeJS.Process;
  var console: Console;
  var Buffer: BufferConstructor;
  var setTimeout: typeof setTimeout;
  var setInterval: typeof setInterval;
  var clearTimeout: typeof clearTimeout;
  var clearInterval: typeof clearInterval;
}

export {};
