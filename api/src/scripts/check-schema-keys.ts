import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import db after env is loaded
const { default: db } = await import('../db.js');

async function checkSchema() {
    const { data, error } = await db.from('api_keys').select('*').limit(1);
    if (error) {
        console.error('Error fetching schema:', error);
    } else {
        console.log('Columns in api_keys:', data.length > 0 ? Object.keys(data[0]) : 'No data, columns unknown');
    }
}

checkSchema();
