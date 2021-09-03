// @ts-check

import { MongoClient } from 'mongodb';

const inputClient = new MongoClient('***REMOVED***');
const outputClient = new MongoClient('mongodb://host.docker.internal:27017');

async function main() {
  await Promise.all([
    inputClient.connect(),
    outputClient.connect()
  ]);
  console.log('Connected to MongoDB.');

  const indb = inputClient.db('portalagamimdb');
  const outdb = outputClient.db('portal-playground');

  migrateUsers(indb, outdb);
}

/**
 * @param {import("mongodb").Db} indb 
 * @param {import("mongodb").Db} outdb 
 */
async function migrateUsers(indb, outdb) {
  const inUsers = indb.collection('users');
  const outUsers = outdb.collection('users');

  const newUsers = await inUsers.aggregate([
    {
      $lookup: {
        from: 'admins',
        localField: 'adId',
        foreignField: 'adId',
        as: 'admin'
      }
    }, {
      $project: {
        adId: 1,
        firstName: '$name',
        lastName: '$surname',
        displayName: 1,
        email: 1,
        admin: {
          $gt: [
            {
              $size: '$admin'
            }, 0
          ]
        },
        role: 1,
        groups: 1,
        favorites: '$favourites'
      }
    }
  ]).toArray();
  console.log(`Aggregated ${newUsers.length} users to new format. Clearing output collection...`);

  await outUsers.deleteMany({});
  console.log(`Clearing successful. Inserting new users into the collection...`);
  
  await outUsers.insertMany(newUsers);
  console.log(`Insertion successful.`);
}

/**
 * @param {import("mongodb").Db} indb 
 * @param {import("mongodb").Db} outdb 
 */
function migrateApps(indb, outdb) {
  const inCatalogItems = indb.collection('catalogitems');
  const outApplications = outdb.collection('applications');

  
}

main();

