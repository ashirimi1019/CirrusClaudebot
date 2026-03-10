/**
 * ConsoleCapture
 * Intercepts console.log / warn / error so skill output can be streamed
 * back to the browser via SSE without spawning a child process.
 */

type LogCallback = (line: string) => void;

export class ConsoleCapture {
  private callback: LogCallback;
  private originalLog: typeof console.log;
  private originalError: typeof console.error;
  private originalWarn: typeof console.warn;
  private active = false;

  constructor(callback: LogCallback) {
    this.callback = callback;
    this.originalLog = console.log.bind(console);
    this.originalError = console.error.bind(console);
    this.originalWarn = console.warn.bind(console);
  }

  private emit(args: unknown[]): void {
    const text = args
      .map((a) => (typeof a === 'string' ? a : String(a)))
      .join(' ');
    for (const line of text.split('\n')) {
      if (line !== '') this.callback(line);
    }
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    const emit = this.emit.bind(this);
    const orig = {
      log: this.originalLog,
      error: this.originalError,
      warn: this.originalWarn,
    };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (console as any).log = (...a: unknown[]) => { orig.log(...a); emit(a); };
    (console as any).error = (...a: unknown[]) => { orig.error(...a); emit(a); };
    (console as any).warn = (...a: unknown[]) => { orig.warn(...a); emit(a); };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    console.log = this.originalLog;
    console.error = this.originalError;
    console.warn = this.originalWarn;
  }
}
