import './peripheral/loadEnv';
import { createServer } from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { WebSocketServer } from 'ws';
import loadControllers from './controller/index';
import { CtxState } from './types/CtxState';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { logger } from './middleware/logger';
import { initWebsocketServer } from './websocket/wss';
import { authenticateMiddleware } from './middleware/authenticate';

const app = new Koa<CtxState>();

app.use(loggerMiddleware);

app.use(cors());

app.use(authenticateMiddleware);

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/image')) {
    ctx.disableBodyParser = true;
  }
  await next();
});
app.use(bodyParser());

loadControllers(app);

const server = createServer(app.callback());

const wss = new WebSocketServer({ server });
initWebsocketServer(wss);

const PORT = process.env.PORT ?? 4000;
server.listen(PORT, () => logger.info(`Listening on port ${PORT}...`));