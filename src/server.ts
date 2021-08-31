import './peripheral/loadEnv.js';
import Koa from 'koa';
import userController from './controller/user.js';
import bodyParser from 'koa-bodyparser';

const app = new Koa();

app.use(bodyParser())

app.use(userController.routes());
app.use(userController.allowedMethods());

const PORT = process.env.PORT ?? 5000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`))