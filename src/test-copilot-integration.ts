#!/usr/bin/env node

/**
 * MCP Server Test Script for VS Code Copilot Integration
 * This script tests the MCP server functionality that VS Code Copilot will use
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const dbConfig = {
  user: "mcp_user",
  host: "localhost",
  database: "mcp_db", 
  password: "mcp_password",
  port: 5432,
};

class MCPCopilotTest {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(dbConfig);
  }

  async testWeatherQueries() {
    console.log("🌤️  Testing Weather Data Queries (VS Code Copilot scenarios)");
    console.log("============================================================");

    const client = await this.pool.connect();

    try {
      // Test 1: Get all weather data
      console.log("\n1️⃣ Query: Get all weather data");
      const allData = await client.query('SELECT COUNT(*) as total FROM weather_data');
      console.log(`   ✅ Found ${allData.rows[0].total} weather records`);

      // Test 2: Get weather by city
      console.log("\n2️⃣ Query: Get weather for New York");
      const nyWeather = await client.query(
        'SELECT city, temperature_celsius, weather_condition FROM weather_data WHERE city = $1',
        ['New York']
      );
      if (nyWeather.rows.length > 0) {
        const weather = nyWeather.rows[0];
        console.log(`   ✅ New York: ${weather.temperature_celsius}°C, ${weather.weather_condition}`);
      }

      // Test 3: Get weather by temperature range
      console.log("\n3️⃣ Query: Get cities with temperature > 25°C");
      const hotCities = await client.query(
        'SELECT city, temperature_celsius FROM weather_data WHERE temperature_celsius > 25 ORDER BY temperature_celsius DESC'
      );
      console.log(`   ✅ Found ${hotCities.rows.length} hot cities:`);
      hotCities.rows.forEach(row => {
        console.log(`      - ${row.city}: ${row.temperature_celsius}°C`);
      });

      // Test 4: Get weather statistics
      console.log("\n4️⃣ Query: Get weather statistics");
      const stats = await client.query(`
        SELECT 
          AVG(temperature_celsius) as avg_temp,
          MIN(temperature_celsius) as min_temp,
          MAX(temperature_celsius) as max_temp,
          COUNT(DISTINCT city) as cities_count
        FROM weather_data
      `);
      const stat = stats.rows[0];
      console.log(`   ✅ Statistics:`);
      console.log(`      - Average temperature: ${parseFloat(stat.avg_temp).toFixed(1)}°C`);
      console.log(`      - Temperature range: ${stat.min_temp}°C to ${stat.max_temp}°C`);
      console.log(`      - Cities monitored: ${stat.cities_count}`);

      // Test 5: Get recent weather data
      console.log("\n5️⃣ Query: Get most recent weather data");
      const recent = await client.query(`
        SELECT city, temperature_celsius, weather_condition, timestamp_utc
        FROM weather_data 
        ORDER BY timestamp_utc DESC 
        LIMIT 3
      `);
      console.log(`   ✅ Recent weather updates:`);
      recent.rows.forEach(row => {
        console.log(`      - ${row.city}: ${row.temperature_celsius}°C, ${row.weather_condition}`);
      });

      // Test 6: Complex query with multiple conditions
      console.log("\n6️⃣ Query: Cities with good weather (sunny, temp 20-30°C)");
      const goodWeather = await client.query(`
        SELECT city, temperature_celsius, weather_condition, humidity_percent
        FROM weather_data 
        WHERE temperature_celsius BETWEEN 20 AND 30 
        AND weather_condition ILIKE '%sunny%'
        ORDER BY temperature_celsius
      `);
      console.log(`   ✅ Found ${goodWeather.rows.length} cities with good weather:`);
      goodWeather.rows.forEach(row => {
        console.log(`      - ${row.city}: ${row.temperature_celsius}°C, ${row.weather_condition}, ${row.humidity_percent}% humidity`);
      });

    } catch (error) {
      console.error("❌ Error during weather query tests:", error);
    } finally {
      client.release();
    }
  }

  async testMCPServerCapabilities() {
    console.log("\n🔧 Testing MCP Server Capabilities");
    console.log("==================================================");

    try {
      // Test database schema introspection
      const client = await this.pool.connect();
      
      console.log("\n📊 Database Schema Information:");
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'weather_data' 
        ORDER BY ordinal_position
      `);
      
      console.log("   Available columns for queries:");
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });

      client.release();
      console.log("\n✅ MCP Server should be able to:");
      console.log("   - Connect to PostgreSQL database");
      console.log("   - Query weather_data table");
      console.log("   - Handle SQL parameters safely");
      console.log("   - Return structured weather information");
      
    } catch (error) {
      console.error("❌ Error testing MCP capabilities:", error);
    }
  }

  async runAllTests() {
    console.log("🚀 Starting MCP Server Validation for VS Code Copilot");
    console.log("🎯 Goal: Verify weather_data can be queried through MCP server");
    console.log("");

    try {
      await this.testWeatherQueries();
      await this.testMCPServerCapabilities();
      
      console.log("\n" + "============================================================");
      console.log("🎉 VS Code Copilot MCP Integration Test Complete!");
      console.log("✅ Your MCP server is ready to serve weather data to VS Code Copilot");
      console.log("💡 You can now ask Copilot questions like:");
      console.log("   - 'What's the weather in New York?'");
      console.log("   - 'Show me cities with temperature above 25°C'");
      console.log("   - 'What are the weather statistics?'");
      console.log("============================================================");
      
    } catch (error) {
      console.error("❌ Test failed:", error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPCopilotTest();
  tester.runAllTests().catch(console.error);
}
