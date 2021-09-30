import { formatWithOptions } from 'util';
import { red, cyan, blue } from 'chalk';

/**
 * Format a string for printing.
 * This does little more than Node's default printing behaviour,
 * but allows embedding objects into string without them turning into `[Object object]`.
 */
export const format = (...args: unknown[]) => formatWithOptions({ colors: true }, ...args);


export class Logger {
  constructor(public isDebug: boolean) { }

  error(...errs: unknown[]) {
    const prefixedErrs = errs.map(err => `[${red('ERROR')}]: ${format(err)}`).join('\n');
    console.error(prefixedErrs);
  }
  debug(...messages: unknown[]) {
    if (this.isDebug) {
      const prefixedMesssages = messages.map(msg => `[${cyan('DEBUG')}]: ${format(msg)}`).join('\n');
      console.log(prefixedMesssages);
    }
  }
  info(...messages: unknown[]) {
    const prefixedMesssages = messages.map(msg => `[${blue('INFO')}]: ${format(msg)}`).join('\n');
    console.info(prefixedMesssages);
  }
}

export const logger = new Logger(process.env.NODE_ENV === 'development');