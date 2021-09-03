import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob'

const storageAccount = process.env.STORAGE_ACCOUNT_NAME;
const storageAccountKey = process.env.STORAGE_ACCOUNT_KEY;
const imageContainerName = process.env.STORAGE_IMAGE_CONTAINER_NAME;

/**
 * @see https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-blob/samples/typescript/src/basic.ts.
 */

if (!storageAccount) {
  console.error('No Blob Storage account name provided; make sure an env variable STOAGE_ACCOUNT_NAME exists with the correct account name.')
  process.exit(1);
}
if (!storageAccountKey) {
  console.error('No Blob Storage account key provided; make sure an env variable STORAGE_ACCOUNT_KEY exists with the correct account key.')
  process.exit(1);
}

const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageAccountKey);

const blobServiceClient = new BlobServiceClient(
  `https://${storageAccount}.blob.core.windows.net`,
  sharedKeyCredential
)


const imageStorageClient = blobServiceClient.getContainerClient(imageContainerName!);
await imageStorageClient.createIfNotExists();

export async function uploadImage(name: string, data: Buffer) {
  const blob = imageStorageClient.getBlockBlobClient(name);

  await blob.upload(data, Buffer.byteLength(data));

  return blob.url;
}
