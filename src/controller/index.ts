import Koa from 'koa';
import userController from './user';
import groupController from './group';
import appController from './application';
import notificationController from './notification';
import imageController from './image';
import categoryController from './category';
import tagController from './tag';

const loadControllers = (app: Koa) => {
  app.use(userController.routes());
  app.use(userController.allowedMethods());
  
  app.use(groupController.routes());
  app.use(groupController.allowedMethods());
  
  app.use(appController.routes());
  app.use(appController.allowedMethods());

  app.use(notificationController.routes());
  app.use(notificationController.allowedMethods());

  app.use(imageController.routes());
  app.use(imageController.allowedMethods());

  app.use(categoryController.routes());
  app.use(categoryController.allowedMethods());

  app.use(tagController.routes());
  app.use(tagController.allowedMethods());
};

export default loadControllers;