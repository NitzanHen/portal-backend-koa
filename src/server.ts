import './peripheral/loadEnv.js';
import Koa from 'koa';
import loadControllers from './controller/index.js';
import bodyParser from 'koa-bodyparser';

const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/image')) {
    ctx.disableBodyParser = true;
  }
  await next();
})
app.use(bodyParser())

loadControllers(app);

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`))