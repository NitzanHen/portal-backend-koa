import './peripheral/loadEnv.js';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import loadControllers from './controller/index.js';
import { authenticate } from './middleware/authenticate.js';
import { CtxState } from './types/CtxState.js';
import { logger } from './middleware/logger.js';

const app = new Koa<CtxState>();

app.use(logger);

app.use(cors());

app.use(authenticate);

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/image')) {
    ctx.disableBodyParser = true;
  }
  await next();
});
app.use(bodyParser());

loadControllers(app);

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));