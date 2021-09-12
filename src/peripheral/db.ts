import { MongoClient } from 'mongodb';
import { getEnvVariableSafely } from '../common/getEnvVariableSafely.js';

const dbConnectionString = getEnvVariableSafely('DB_CONN_STR');
const dbName = getEnvVariableSafely('DB_NAME');

const client = await new MongoClient(dbConnectionString).connect();
console.log('Successfully connected to MongoDB');

export const db = client.db(dbName);