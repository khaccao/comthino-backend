import sql from 'mssql';

let poolPromise: Promise<sql.ConnectionPool> | null = null;

const getConnectionString = () =>
  process.env.CAO_CONNECTION ||
  process.env.CAO_CONNECTION_STRING ||
  process.env.CaoConnection ||
  process.env.CAO_DATABASE_URL;

export const getCaoPool = async () => {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('Missing CaoConnection. Set CAO_CONNECTION or CaoConnection in the backend environment.');
  }

  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(connectionString).connect();
  }

  return poolPromise;
};

export { sql };
