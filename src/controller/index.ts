import Koa from 'koa';
import userController from './user.js';
import groupController from './group.js';
import appController from './application.js';
import notificationController from './notification.js';

const loadControllers = (app: Koa) => {
  app.use(userController.routes());
  app.use(userController.allowedMethods());
  
  app.use(groupController.routes());
  app.use(groupController.allowedMethods());
  
  app.use(appController.routes());
  app.use(appController.allowedMethods());

  app.use(notificationController.routes());
  app.use(notificationController.allowedMethods());
}

export default loadControllers;