import { config } from "config";

const originalConsole = console;

// Define custom colors for each log level
const colors = {
  trace: 'color: purple',
  debug: 'color: blue',
  info: 'color: green',
  warn: 'color: orange',
  error: 'color: red; font-weight: bold',
  success: 'color: green; font-weight: bold',
  appEvent: 'color: #87ffef',
  // ===
  time: 'color: gray',
  log: 'color: #87ffef', // light blue
};

const getMethod = (name: string) => {
  return (message: string, ...args: any[]) => {
    const currentTime = new Date().toISOString();
    const mesageIsString = typeof message === 'string';

    if (mesageIsString && message.startsWith('%c')) {
      // const string = `%c[${name.toLocaleUpperCase()}] %c[${currentTime}]%c ${message}`;
      const string = `%c[${name.toLocaleUpperCase()}] ${message}`;

      return originalConsole.info.apply(
        originalConsole,
        [
          string,
          colors[name],
          // colors.time,
          // colors.log,
          ...args
        ]
      );
    } else {
      // const string = `%c[${name.toLocaleUpperCase()}] %c[${currentTime}]%c`;
      const string = `%c[${name.toLocaleUpperCase()}]`;

      return originalConsole.info.apply(
        originalConsole,
        [
          string,
          colors[name],
          // colors.time,
          // colors.log,
          message,
          ...args
        ]
      );
    }
  };
}

interface LogMethod {
  (message: any, ...args: any[]): void;
  trace?: LogMethod;
  debug?: LogMethod;
  info?: LogMethod;
  warn?: LogMethod;
  error?: LogMethod;
  success?: LogMethod;
  appEvent?: LogMethod;
}

const log: LogMethod = getMethod('log');

log.trace = getMethod('trace');
log.debug = getMethod('debug');
log.info = getMethod('info');
log.warn = getMethod('warn');
log.error = getMethod('error');
log.success = getMethod('success');

// extra
log.appEvent = config.enableAppEventLogs ? getMethod('appEvent') : () => {};

export { log };
