#!/usr/bin/env node

import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const dbConfig = {
  user: process.env.POSTGRES_USER || "mcp_user",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "mcp_db",
  password: process.env.POSTGRES_PASSWORD || "mcp_password",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
};

async function testConnection() {
  console.log("🔍 Testing PostgreSQL connection...");
  console.log("📋 Configuration:");
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log("");

  const pool = new Pool(dbConfig);

  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful!");
    
    // Test basic query
    const result = await client.query("SELECT version(), current_database(), current_user");
    console.log("📊 Database Information:");
    console.log(`  Version: ${result.rows[0].version}`);
    console.log(`  Current Database: ${result.rows[0].current_database}`);
    console.log(`  Current User: ${result.rows[0].current_user}`);
    
    client.release();
    
    // Test schema access
    const schemaClient = await pool.connect();
    const tablesResult = await schemaClient.query(
      "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log(`  Tables in public schema: ${tablesResult.rows[0].table_count}`);
    schemaClient.release();
    
    console.log("");
    console.log("🎉 All tests passed! Your PostgreSQL MCP server is ready to use.");
    
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.log("");
    console.log("💡 Troubleshooting tips:");
    console.log("   1. Make sure PostgreSQL is running");
    console.log("   2. Check your .env configuration");
    console.log("   3. Verify database credentials");
    console.log("   4. Ensure the database exists");
    console.log("   5. Check firewall and network settings");
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
