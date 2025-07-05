import process from 'node:process'

const API_ID = Number.parseInt(process.env.API_ID!)
const API_HASH = process.env.API_HASH!
const PG_HOST = process.env.PG_HOST || 'localhost'
const PG_PORT = Number.parseInt(process.env.PG_PORT || '5432')
const PG_USER = process.env.PG_USER || 'postgres'
const PG_PASSWORD = process.env.PG_PASSWORD || 'password'
const PG_DATABASE = process.env.PG_DATABASE || 'database_name'

if (Number.isNaN(API_ID) || !API_HASH) {
    throw new Error('API_ID or API_HASH not set!')
}

export { API_HASH, API_ID, PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE }
