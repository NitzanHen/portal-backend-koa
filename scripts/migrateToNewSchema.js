// @ts-check

import { MongoClient } from 'mongodb';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob'
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
const { grey, green } = chalk;

const argv = yargs(hideBin(process.argv))
  .options({
    indbConn: { type: 'string', demandOption: true },
    indbName: { type: 'string', demandOption: true },
    outdbConn: { type: 'string', demandOption: true },
    outdbName: { type: 'string', demandOption: true },
    storageAccount: { type: 'string', demandOption: true },
    storageAccountKey: { type: 'string', demandOption: true },
    imageContainerName: { type: 'string', demandOption: true },
  }).parseSync()

const { indbConn, indbName, outdbConn, outdbName, storageAccount, storageAccountKey, imageContainerName } = argv;

// Init mongo clients

const inputClient = new MongoClient(indbConn);
const outputClient = new MongoClient(outdbConn);

// Init azure blob storage

const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageAccountKey);

const blobServiceClient = new BlobServiceClient(
  `https://${storageAccount}.blob.core.windows.net`,
  sharedKeyCredential
)

const imageStorageClient = blobServiceClient.getContainerClient(imageContainerName);

/** 
 * @param {string} name
 * @param {Buffer} data
 */
async function uploadImage(name, data) {
  const blob = imageStorageClient.getBlockBlobClient(name);

  await blob.upload(data, Buffer.byteLength(data), {
    blobHTTPHeaders: {
      blobContentType: "image"
    }
  });

  return blob.url;
}

// Main execution

async function main() {
  await Promise.all([
    inputClient.connect(),
    outputClient.connect()
  ]);
  console.log('Connected to MongoDB.');

  const indb = inputClient.db(indbName);
  const outdb = outputClient.db(outdbName);

  //await imageStorageClient.deleteIfExists();
  await imageStorageClient.createIfNotExists({
    access: "blob"
  });

  await migrateUsers(indb, outdb);
  await migrateApps(indb, outdb);
  await migrateGroups(indb, outdb);
  await migrateCategories(indb, outdb);
  await migrateTags(indb, outdb);

  process.exit(0);
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
        oid: "$adId",
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
async function migrateApps(indb, outdb) {
  const inCatalogItems = indb.collection('catalogitems');
  const outApplications = outdb.collection('applications');
  await outApplications.deleteMany({});

  const applications = await inCatalogItems.aggregate([
    {
      $project: {
        title: 1,
        description: 1,
        url: 1,
        creationDate: '$release',
        tags: 1,
        categories: 1,
        groups: 1,
        responsive: 1,
        image: '$image.data'
      },
    }
  ]).toArray();

  console.log(`Read ${applications.length} applications, including raw image data. uploading images...`);

  let count = 0;

  const appsWithImageURL = applications.map((app, i) => {
    const img = app.image;
    const ext = /^data:image\/(\w+);base64,/.exec(img)[1];
    const content = img.replace(/^data:image\/(\w+);base64,/, '');
    const filename = `${app._id}.${ext}`;

    const dataBuffer = Buffer.from(content, 'base64');
    return uploadImage(filename, dataBuffer)
      .then(imageUrl => {
        const { image, ...appWithUrl } = app;
        appWithUrl.imageUrl = imageUrl;

        console.log(`(${grey(++count)}): Uploaded image #${i + 1} for app ${green(app.title)}`);

        return appWithUrl;
      });
  });

  const uploadResults = await Promise.allSettled(appsWithImageURL);
  const newApps = [];
  const failedUploads = [];
  for (const result of uploadResults) {
    if (result.status === 'fulfilled') {
      newApps.push(result.value);
    }
    else {
      failedUploads.push(result.reason);
    }
  };

  console.log(`Finished uploading images. ${newApps.length} images were uploaded successfully, ${failedUploads.length} failed.`)

  const response = await outApplications.insertMany(newApps);
  console.log(`Inserted ${response.insertedCount} new applications into the out collection.`);

  if (failedUploads.length > 0) {
    console.log('printing upload errors', ...failedUploads);
  }
}

/**
 * @param {import("mongodb").Db} indb 
 * @param {import("mongodb").Db} outdb
 */
async function migrateGroups(indb, outdb) {
  const inGroups = indb.collection('groups');
  const outGroups = outdb.collection('groups');

  const groups = await inGroups.aggregate([
    {
      $project: {
        name: 1
      }
    }
  ]).toArray();

  console.log(`Aggregated ${groups.length} groups. Inserting into new collection...`);

  await outGroups.deleteMany({});
  const response = await outGroups.insertMany(groups);

  console.log(`Successfully inserted ${response.insertedCount} groups into the new collection`);
}

/**
 * @param {import("mongodb").Db} indb 
 * @param {import("mongodb").Db} outdb
 */
async function migrateCategories(indb, outdb) {
  const inCategories = indb.collection('categories');
  const outCategories = outdb.collection('categories');

  const categories = await inCategories.aggregate([
    {
      $project: {
        name: 1
      }
    }
  ]).toArray();

  console.log(`Aggregated ${categories.length} categories. Inserting into new collection...`);

  await outCategories.deleteMany({});
  const response = await outCategories.insertMany(categories);

  console.log(`Successfully inserted ${response.insertedCount} categories into the new collection`);
}

/**
 * @param {import("mongodb").Db} indb 
 * @param {import("mongodb").Db} outdb
 */
async function migrateTags(indb, outdb) {
  const inTags = indb.collection('tags');
  const outTags = outdb.collection('tags');

  const tags = await inTags.aggregate([
    {
      $project: {
        name: 1
      }
    }
  ]).toArray();

  console.log(`Aggregated ${tags.length} tags. Inserting into new collection...`);

  await outTags.deleteMany({});
  const response = await outTags.insertMany(tags);

  console.log(`Successfully inserted ${response.insertedCount} tags into the new collection`);
}

main();
