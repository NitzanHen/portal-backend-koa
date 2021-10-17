import { cyan, green, red, redBright, yellow, grey, magenta, bold } from 'chalk';
import { Middleware } from 'koa';
import { logger } from '../common/logger';

/**
 * Logs incoming requests and outgoing responses, response times, etc. 
 */
export const loggerMiddleware: Middleware = async (ctx, next) => {
  const startTime = Date.now();
  logger.info(`Received ${bold(ctx.method)} request to ${green(ctx.originalUrl)}`);
  await next();

  const timeDiff = (Date.now() - startTime) / 1000;
  const logColor = (() => {
    if (timeDiff < 0.5) return cyan;
    else if (timeDiff < 3) return yellow;
    else return red;
  })();
  const statusColor = (() => {
    const { status } = ctx;
    if (200 <= status && status < 300) {
      return green;
    }
    else if (400 <= status && status < 500) {
      return redBright;
    }
    else if (500 <= status && status < 600) {
      return magenta;
    }

    return grey;
  })();

  logger.info(`${bold(ctx.method)} Request to ${green(ctx.originalUrl)} finished in ${logColor(timeDiff.toFixed(3) + 's')}, Response status: ${statusColor(ctx.status)}`);
};