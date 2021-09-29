import { MongoClient } from 'mongodb';
import { getEnvVariableSafely } from '../common/getEnvVariableSafely.js';
// import { logger } from './logger.js';

const dbConnectionString = getEnvVariableSafely('DB_CONN_STR');
const dbName = getEnvVariableSafely('DB_NAME');

const connection = new MongoClient(dbConnectionString).connect();
connection.then(() => {
  // logger.info('Connected to MongoDB');
});

export const getDb = () => connection.then(client => client.db(dbName));

export const getDbCollection = <D>(name: string) => getDb().then(db => db.collection<D>(name));