import { AsyncResult, resultify } from '../common/Result';
import { OptionalId } from '../common/types';
import { Tag, TagWithId } from '../model/Tag';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class TagService extends MongoService<OptionalId<Tag>> {
  constructor() {
    super(getDbCollection('tags'));
  }

  /** @todo there should probably not be an access point which sends all the data in the collection. */
  findAll(): AsyncResult<TagWithId[]> {
    return resultify(this.collection.find({}).toArray()) as AsyncResult<TagWithId[]>;
  }
}

export const tagService = new TagService();