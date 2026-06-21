const sql = require('mssql');

const config = {
    user: 'cao_admin',
    password: 'Cao@Admin123!',
    server: '103.200.22.167',
    port: 1433,
    database: 'master', // connect to master to create new db
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function createDb() {
    try {
        await sql.connect(config);
        console.log('Connected to SQL Server (master).');
        
        // Check if database exists
        const checkResult = await sql.query`SELECT db_id('ComThiNoDB') as dbId`;
        
        if (checkResult.recordset[0].dbId) {
            console.log('Database ComThiNoDB already exists.');
        } else {
            console.log('Creating database ComThiNoDB...');
            await sql.query`CREATE DATABASE ComThiNoDB`;
            console.log('Database created successfully!');
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

createDb();
