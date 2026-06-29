import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl || dbUrl.includes('your-neon-project')) {
        console.error('DATABASE_URL is not set or is still using placeholder. Migration aborted.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Neon Database.');

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`Running migration: ${file}...`);
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf8');
                
                await client.query(sql);
                console.log(`Migration ${file} executed successfully.`);
            }
        }

        console.log('All migrations completed successfully.');
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations();
