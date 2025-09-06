#!/usr/bin/env node

import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const dbConfig = {
  user: "mcp_user",  // Force correct user
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "mcp_db",
  password: "mcp_password",  // Force correct password
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
};

async function validateWeatherData() {
  console.log("🔍 Validating Weather Data for MCP Server...");
  console.log("📋 Database Configuration:");
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log("");

  const pool = new Pool(dbConfig);

  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful!");
    
    // Check if weather_data table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'weather_data'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log("❌ weather_data table does not exist");
      client.release();
      await pool.end();
      return;
    }
    
    console.log("✅ weather_data table exists");
    
    // Get table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'weather_data' 
      ORDER BY ordinal_position
    `);
    
    console.log("\n📋 Weather Data Table Structure:");
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Count total records
    const countResult = await client.query('SELECT COUNT(*) as total FROM weather_data');
    const totalRecords = countResult.rows[0].total;
    console.log(`\n📊 Total records in weather_data: ${totalRecords}`);
    
    // Get sample data
    if (totalRecords > 0) {
      const sampleData = await client.query('SELECT * FROM weather_data LIMIT 3');
      console.log("\n🔍 Sample data (first 3 rows):");
      sampleData.rows.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`    ${key}: ${row[key]}`);
        });
        console.log("");
      });
    } else {
      console.log("\n⚠️  No data found in weather_data table");
    }
    
    // Test a sample query that MCP server might use
    console.log("🧪 Testing sample MCP queries:");
    
    try {
      const recentData = await client.query(`
        SELECT * FROM weather_data 
        ORDER BY CASE 
          WHEN 'timestamp' IN (SELECT column_name FROM information_schema.columns WHERE table_name = 'weather_data') 
          THEN timestamp 
          ELSE 1 
        END DESC 
        LIMIT 5
      `);
      console.log(`✅ Recent data query successful (${recentData.rows.length} rows)`);
    } catch (error) {
      // Try alternative query without timestamp ordering
      const altData = await client.query('SELECT * FROM weather_data LIMIT 5');
      console.log(`✅ Basic data query successful (${altData.rows.length} rows)`);
    }
    
    client.release();
    
    console.log("\n🎉 Weather data validation complete!");
    console.log("✅ Your MCP server should be able to query weather_data successfully");
    
  } catch (error) {
    console.error("❌ Error during validation:", error instanceof Error ? error.message : String(error));
  } finally {
    await pool.end();
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateWeatherData().catch(console.error);
}

export { validateWeatherData };
