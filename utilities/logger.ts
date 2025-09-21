import log4js from 'log4js';

export class LoggerFactory {
  private static readonly resetColor = '\x1b[0m';
  private static readonly timestampColor = '\x1b[35m'; // purple
  private static readonly locationColor = '\x1b[36m'; // light blue
  private static readonly messageColor = '\x1b[30m'; // black
  private static readonly valueColor = '\x1b[38;5;141m'; // violet

  private static readonly levelColors: Record<string, string> = {
    TRACE: '\x1b[90m',  // gray
    DEBUG: '\x1b[34m',  // blue
    INFO: '\x1b[32m',   // green
    WARN: '\x1b[33m',   // yellow
    ERROR: '\x1b[31m',  // red
    FATAL: '\x1b[41m',  // red background
  };

  // Setup log4js layout
  static {
    log4js.addLayout('custom', () => {
      return (logEvent) => {
        const levelStr = logEvent.level.levelStr;
        const levelColor = LoggerFactory.levelColors[levelStr] || '';
        const dateObj = new Date(logEvent.startTime);

        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = dateObj.getFullYear();

        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');

        const timestamp = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;

        const coloredLevel = `${levelColor}[${levelStr}]${LoggerFactory.resetColor}`;
        const coloredTimestamp = `${LoggerFactory.timestampColor}[${timestamp}]${LoggerFactory.resetColor}`;

        const [message, value, location] = logEvent.data;

        const coloredLocation = location
          ? `${LoggerFactory.locationColor}${location}${LoggerFactory.resetColor}`
          : `${LoggerFactory.locationColor}unknown${LoggerFactory.resetColor}`;

        const coloredMessage = `${LoggerFactory.messageColor}${message}${LoggerFactory.resetColor}`;
        const coloredValue = value
          ? `${LoggerFactory.valueColor}${value}${LoggerFactory.resetColor}`
          : '';

        return `${coloredLevel} ${coloredTimestamp} ${coloredLocation} : ${coloredMessage} ${coloredValue}\n------------------------------------------------------------------------------------------------------------------------------------------`;
      };
    });

    log4js.configure({
      appenders: {
        out: { type: 'stdout', layout: { type: 'custom' } },
        file: { type: 'file', filename: 'logs/playwright.log', layout: { type: 'custom' } },
      },
      categories: {
        default: { appenders: ['out', 'file'], level: 'debug' },
      },
    });
  }

  /**
   * Get logger instance.
   * @param classFile Typically pass `__filename`
   */
  public static getLogger(classFile: string) {
    const rawLogger = log4js.getLogger(); // No category name needed

    return new Proxy(rawLogger, {
      get: (target, prop) => {
        if (
          typeof prop === 'string' &&
          ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop)
        ) {
          return (...args: any[]) => {
            const stack = new Error().stack?.split('\n') || [];

            // Find first external caller line
            const callerLine = stack.find(line =>
              line.includes('at ') &&
              !line.includes('LoggerFactory') &&
              !line.includes('log4js') &&
              !line.includes('node:') &&
              !line.includes('internal/') &&
              !line.includes('Proxy.') &&
              !line.includes('Object.<anonymous>') &&
              line.match(/(.*):(\d+):(\d+)\)?$/)
            );

            let lineInfo = 'unknown';
            if (callerLine) {
              const match = callerLine.match(/(?:\()?(.*):(\d+):(\d+)\)?$/);
              if (match) {
                const fullPath = match[1];
                const fileName = fullPath.split(/[\\/]/).pop();
                const line = match[2];
                lineInfo = `${fileName}:${line}`;
              }
            }

            const message = args[0] ?? '';
            const value = args[1] ?? '';

            target[prop](message, value, lineInfo);
          };
        }

        return (target as any)[prop];
      }
    });
  }
}
