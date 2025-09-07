#!/usr/bin/env tsx

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
    user: process.env.POSTGRES_USER || "postgres",
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DATABASE || "postgres",
    password: process.env.POSTGRES_PASSWORD || "",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "10"),
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || "30000"),
    connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || "10000"),
};

// Create database pool
const pool = new Pool(dbConfig);

async function setupWeatherData() {
    const client = await pool.connect();
    
    try {
        console.log('Creating weather_data table...');
        
        // Drop table if exists and create new one
        await client.query('DROP TABLE IF EXISTS weather_data');
        
        const createTableQuery = `
            CREATE TABLE weather_data (
                id SERIAL PRIMARY KEY,
                precipitation DECIMAL(6,2),
                date_full DATE,
                date_month INTEGER,
                date_week_of INTEGER,
                date_year INTEGER,
                station_city VARCHAR(100),
                station_code VARCHAR(10),
                station_location VARCHAR(200),
                station_state VARCHAR(50),
                avg_temp DECIMAL(5,1),
                max_temp DECIMAL(5,1),
                min_temp DECIMAL(5,1),
                wind_direction INTEGER,
                wind_speed DECIMAL(6,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await client.query(createTableQuery);
        console.log('Table created successfully!');
        
        // Read and parse CSV file
        const csvPath = path.join(__dirname, 'weather.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        // Skip header line and filter out empty lines
        const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
        
        console.log(`Loading ${dataLines.length} records...`);
        
        let recordsInserted = 0;
        let recordsSkipped = 0;
        
        // Process records in batches to avoid memory issues
        const batchSize = 1000;
        for (let i = 0; i < dataLines.length; i += batchSize) {
            const batch = dataLines.slice(i, i + batchSize);
            
            for (const line of batch) {
                try {
                    // Parse CSV line (handling quoted values)
                    const values = parseCSVLine(line);
                    
                    if (values.length >= 14) {
                        const insertQuery = `
                            INSERT INTO weather_data (
                                precipitation, date_full, date_month, date_week_of, date_year,
                                station_city, station_code, station_location, station_state,
                                avg_temp, max_temp, min_temp, wind_direction, wind_speed
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        `;
                        
                        // Parse and convert values
                        const precipitation = parseFloat(values[0]) || 0;
                        const dateString = values[1]; // Format: 2016-01-03
                        const month = parseInt(values[2]) || null;
                        const weekOf = parseInt(values[3]) || null;
                        const year = parseInt(values[4]) || null;
                        const city = values[5] || null;
                        const code = values[6] || null;
                        const location = values[7] || null;
                        const state = values[8] || null;
                        const avgTemp = parseFloat(values[9]) || null;
                        const maxTemp = parseFloat(values[10]) || null;
                        const minTemp = parseFloat(values[11]) || null;
                        const windDirection = parseInt(values[12]) || null;
                        const windSpeed = parseFloat(values[13]) || null;
                        
                        await client.query(insertQuery, [
                            precipitation, dateString, month, weekOf, year,
                            city, code, location, state,
                            avgTemp, maxTemp, minTemp, windDirection, windSpeed
                        ]);
                        
                        recordsInserted++;
                    } else {
                        recordsSkipped++;
                        console.log(`Skipped line ${i + 1}: insufficient data`);
                    }
                } catch (error) {
                    recordsSkipped++;
                    console.log(`Error processing line ${i + 1}: ${error.message}`);
                }
            }
            
            // Show progress
            if ((i + batchSize) % 5000 === 0 || i + batchSize >= dataLines.length) {
                console.log(`Processed ${Math.min(i + batchSize, dataLines.length)} / ${dataLines.length} lines...`);
            }
        }
        
        console.log(`\nData loading complete!`);
        console.log(`Records inserted: ${recordsInserted}`);
        console.log(`Records skipped: ${recordsSkipped}`);
        
        // Show table statistics
        const countResult = await client.query('SELECT COUNT(*) FROM weather_data');
        console.log(`Total records in table: ${countResult.rows[0].count}`);
        
        // Show sample data
        console.log('\nSample records:');
        const sampleResult = await client.query(`
            SELECT station_city, station_state, date_full, avg_temp, precipitation 
            FROM weather_data 
            ORDER BY date_full 
            LIMIT 5
        `);
        
        sampleResult.rows.forEach(row => {
            console.log(`${row.station_city}, ${row.station_state} | ${row.date_full} | Temp: ${row.avg_temp}°F | Precip: ${row.precipitation}"`);
        });
        
    } catch (error) {
        console.error('Error setting up weather data:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Don't forget the last field
    result.push(current.trim());
    
    return result;
}

// Main execution
async function main() {
    try {
        await setupWeatherData();
        console.log('\nWeather data setup completed successfully!');
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        await pool.end();
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
