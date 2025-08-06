import log4js from 'log4js';

export class LoggerFactory {
  private static readonly resetColor = '\x1b[0m';
  private static readonly timestampColor = '\x1b[35m'; // purple
  private static readonly fileColor = '\x1b[96m'; // cyan
  private static readonly levelColors: Record<string, string> = {
    TRACE: '\x1b[90m',  // gray
    DEBUG: '\x1b[34m',  // blue
    INFO: '\x1b[32m',   // green
    WARN: '\x1b[33m',   // yellow
    ERROR: '\x1b[31m',  // red
    FATAL: '\x1b[41m',  // red background
  };

  // Custom layout
  static {
    log4js.addLayout('custom', () => {
      return (logEvent) => {
        const levelStr = logEvent.level.levelStr;
        const levelColor = LoggerFactory.levelColors[levelStr] || '';
        const iso = logEvent.startTime.toISOString().split('.')[0];
        const timestamp = iso.replace('T', ' '); // remove T and Z

        const coloredLevel = `${levelColor}[${levelStr}]${LoggerFactory.resetColor}`;
        const coloredTimestamp = `${LoggerFactory.timestampColor}[${timestamp}]${LoggerFactory.resetColor}`;

        const [message, location] = logEvent.data;
        const coloredLocation = location
          ? `${LoggerFactory.fileColor}${location}${LoggerFactory.resetColor}`
          : 'unknown';

        return `${coloredLevel} ${coloredTimestamp} ${coloredLocation} : ${message}`;
      };
    });

    log4js.configure({
      appenders: {
        out: { type: 'stdout', layout: { type: 'custom' } },
        file: { type: 'file', filename: 'logs/playwright.log', layout: { type: 'custom' } }
      },
      categories: {
        default: { appenders: ['out', 'file'], level: 'debug' }
      }
    });
  }

  public static getLogger(classFile: string) {
    const className = classFile.split(/[\\/]/).pop()?.replace('.ts', '') || 'UnknownClass';
    const rawLogger = log4js.getLogger(className);

    return new Proxy(rawLogger, {
      get: (target, prop) => {
        if (
          typeof prop === 'string' &&
          ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop)
        ) {
          return (...args: any[]) => {
            const stack = new Error().stack?.split('\n') || [];

            const callerLine = stack.find(line =>
              !line.includes('LoggerFactory') &&
              !line.includes('log4js') &&
              !line.includes('node:') &&
              !line.includes('internal/') &&
              !line.includes('Proxy.') &&
              line.match(/\((.*):(\d+):(\d+)\)$/)
            );

            let lineInfo = 'unknown';
            if (callerLine) {
              const match = callerLine.match(/\((.*):(\d+):(\d+)\)$/);
              if (match) {
                const fullPath = match[1];
                const fileName = fullPath.split(/[\\/]/).pop();
                const line = match[2];
                lineInfo = `${fileName}:${line}`;
              }
            }

            target[prop](args.join(' '), lineInfo);
          };
        }

        return (target as any)[prop];
      }
    });
  }
}
