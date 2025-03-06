
const dbConnection = require('./dbConnection');

async function executeQuery(query, params) {
  let connection;
  try {
    connection = await dbConnection.getConnection();
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    throw error;
  } finally {
    if (connection) await connection.release();
  }
}

module.exports = { executeQuery };
