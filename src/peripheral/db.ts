import { MongoClient } from 'mongodb';

if (!process.env.DB_CONN_STR) {
  console.error('No connection string provided; make sure an env variable DB_CONN_STR exists with the correct connection string.')
  process.exit(1);
}
if (!process.env.DB_NAME) {
  console.error('No database name provided; make sure an env variable DB_NAME exists with the correct db name.')
  process.exit(1);
}

const client = await new MongoClient(process.env.DB_CONN_STR).connect();
console.log('Successfully connected to MongoDB');

export const db = client.db(process.env.DB_NAME)