import { OptionalId } from '../common/types';
import { Tag } from '../model/Tag';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class TagService extends MongoService<OptionalId<Tag>> {
  constructor() {
    super(getDbCollection('tags'));
  }
}

export const tagService = new TagService();