import { Pool, Client } from 'pg';

import * as env from './env.ts'

const pool = new Pool({
    user: env.PG_USER,
    host: env.PG_HOST,
    database:  env.PG_DATABASE,
    password: env.PG_PASSWORD,
    port: env.PG_PORT,
});

export default pool;