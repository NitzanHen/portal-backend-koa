import { } from './peripheral/loadEnv';
import Koa from 'koa';
import userController from './controller/user';

const app = new Koa();

app.use(userController.routes());
app.use(userController.allowedMethods());

const PORT = process.env.PORT ?? 5000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`))