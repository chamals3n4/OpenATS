const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mydb',
    password: '01jathusha', 
    port: 5432,
});

pool.on('connect', () => console.log('Connected to PostgreSQL mydb'));

module.exports = pool;