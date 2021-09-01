import Koa from 'koa';
import userController from './user.js';
import groupController from './group.js';

const loadControllers = (app: Koa) => {
  app.use(userController.routes());
  app.use(userController.allowedMethods());
  app.use(groupController.routes());
  app.use(groupController.allowedMethods());
}

export default loadControllers;