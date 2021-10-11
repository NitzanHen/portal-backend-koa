import { Category, CategoryWithId } from '../model/Category';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class CategoryService extends MongoService<Category, CategoryWithId> {
  constructor() {
    super(getDbCollection('categories'));
  }

  /** @todo this is not suitable for production. Switch to a findByGroups */
  findAll() {
    return this.collection.find({}).toArray();
  }
}

export const categoryService = new CategoryService();