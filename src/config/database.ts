import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    user: process.env.POSTGRES_USER || 'mcp_user',
    password: process.env.POSTGRES_PASSWORD || 'mcp_password',
    database: process.env.POSTGRES_DB || 'mcp_db',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Test that we can connect to the database
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
