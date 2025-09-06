#!/usr/bin/env node

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

class WeatherService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(dbConfig);
  }

  async getCityWeather(cityName: string) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT 
          city, country, temperature_celsius, temperature_fahrenheit,
          weather_condition, weather_description, humidity_percent,
          pressure_hpa, wind_speed_kmh, wind_direction_degrees,
          visibility_km, uv_index, precipitation_mm, cloud_cover_percent,
          feels_like_celsius, timestamp_utc
        FROM weather_data 
        WHERE city ILIKE $1
        ORDER BY timestamp_utc DESC`,
        [cityName]
      );

      if (result.rows.length === 0) {
        return { error: `No weather data found for ${cityName}` };
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getLatestWeather(limit: number = 5) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT city, country, temperature_celsius, weather_condition, 
         humidity_percent, timestamp_utc
        FROM weather_data 
        ORDER BY timestamp_utc DESC 
        LIMIT $1`,
        [limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  async getHotCities(minTemp: number = 25) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT city, country, temperature_celsius, weather_condition
        FROM weather_data 
        WHERE temperature_celsius > $1
        ORDER BY temperature_celsius DESC`,
        [minTemp]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  async getWeatherStats() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT 
          AVG(temperature_celsius) as avg_temp,
          MIN(temperature_celsius) as min_temp,
          MAX(temperature_celsius) as max_temp,
          COUNT(DISTINCT city) as cities_count,
          COUNT(*) as total_records
        FROM weather_data`
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Helper function to format weather display
function displayWeather(weather: any) {
  if (weather.error) {
    console.log(`❌ ${weather.error}`);
    return;
  }

  console.log(`🏙️  ${weather.city}, ${weather.country}`);
  console.log(`📅 ${new Date(weather.timestamp_utc).toLocaleString()}`);
  console.log(`🌡️  ${weather.temperature_celsius}°C (${weather.temperature_fahrenheit}°F)`);
  if (weather.feels_like_celsius) {
    console.log(`🌡️  Feels like: ${weather.feels_like_celsius}°C`);
  }
  console.log(`☁️  ${weather.weather_condition}`);
  if (weather.weather_description) {
    console.log(`📝 ${weather.weather_description}`);
  }
  console.log(`💧 Humidity: ${weather.humidity_percent}%`);
  console.log(`🌬️  Wind: ${weather.wind_speed_kmh} km/h`);
  if (weather.visibility_km) {
    console.log(`👁️  Visibility: ${weather.visibility_km} km`);
  }
  if (weather.uv_index) {
    console.log(`☀️  UV Index: ${weather.uv_index}`);
  }
}

// CLI interface
async function main() {
  const service = new WeatherService();
  const command = process.argv[2];
  const param = process.argv[3];

  try {
    switch (command) {
      case 'city':
        if (!param) {
          console.log('Usage: npx tsx weather-service.ts city <city_name>');
          return;
        }
        console.log(`🌤️  Weather in ${param}`);
        console.log('='.repeat(30));
        const weather = await service.getCityWeather(param);
        displayWeather(weather);
        break;

      case 'latest':
        const limit = param ? parseInt(param) : 5;
        console.log(`🌤️  Latest Weather (${limit} cities)`);
        console.log('='.repeat(30));
        const latest = await service.getLatestWeather(limit);
        latest.forEach((w, i) => {
          console.log(`${i + 1}. ${w.city}, ${w.country}: ${w.temperature_celsius}°C - ${w.weather_condition}`);
        });
        break;

      case 'hot':
        const minTemp = param ? parseFloat(param) : 25;
        console.log(`🔥 Cities above ${minTemp}°C`);
        console.log('='.repeat(30));
        const hot = await service.getHotCities(minTemp);
        hot.forEach((w, i) => {
          console.log(`${i + 1}. ${w.city}, ${w.country}: ${w.temperature_celsius}°C - ${w.weather_condition}`);
        });
        break;

      case 'stats':
        console.log('📊 Weather Statistics');
        console.log('='.repeat(30));
        const stats = await service.getWeatherStats();
        console.log(`Average Temperature: ${parseFloat(stats.avg_temp).toFixed(1)}°C`);
        console.log(`Temperature Range: ${stats.min_temp}°C to ${stats.max_temp}°C`);
        console.log(`Cities Monitored: ${stats.cities_count}`);
        console.log(`Total Records: ${stats.total_records}`);
        break;

      default:
        console.log('🌤️  Weather Service Commands:');
        console.log('================================');
        console.log('npx tsx weather-service.ts city <name>    - Get weather for specific city');
        console.log('npx tsx weather-service.ts latest [count] - Get latest weather (default: 5)');
        console.log('npx tsx weather-service.ts hot [temp]     - Get cities above temperature (default: 25°C)');
        console.log('npx tsx weather-service.ts stats          - Get weather statistics');
        console.log('');
        console.log('Examples:');
        console.log('npx tsx weather-service.ts city Tokyo');
        console.log('npx tsx weather-service.ts latest 3');
        console.log('npx tsx weather-service.ts hot 30');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await service.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WeatherService };
