import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { getEnvVariableSafely } from '../common/getEnvVariableSafely';

const storageAccount = getEnvVariableSafely('STORAGE_ACCOUNT_NAME');
const storageAccountKey = getEnvVariableSafely('STORAGE_ACCOUNT_KEY');
const imageContainerName = getEnvVariableSafely('STORAGE_IMAGE_CONTAINER_NAME');

/**
 * @see https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-blob/samples/typescript/src/basic.ts.
 */

const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, storageAccountKey);

const blobServiceClient = new BlobServiceClient(
  `https://${storageAccount}.blob.core.windows.net`,
  sharedKeyCredential
);

const imageStorageClient = blobServiceClient.getContainerClient(imageContainerName!);
const containerPromise = imageStorageClient.createIfNotExists({
  access: 'blob'
});

export async function uploadImage(name: string, data: Buffer) {
  await containerPromise;

  const blob = imageStorageClient.getBlockBlobClient(name);

  await blob.upload(data, Buffer.byteLength(data), {
    blobHTTPHeaders: {
      blobContentType: 'image'
    }
  });

  return blob.url;
}
