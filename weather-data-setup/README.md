# Weather Data Setup

This folder contains scripts and data for setting up a weather database with historical weather data from various US weather stations.

## Files

- `weather.csv` - Weather data from various US weather stations (16,744+ records)
- `setup-weather-data.ts` - TypeScript script to create the `weather_data` table and load CSV data into PostgreSQL

## Weather Data Schema

The `setup-weather-data.ts` script creates a `weather_data` table with the following columns:

- `id` - Auto-incrementing primary key (SERIAL)
- `precipitation` - Precipitation amount in inches (DECIMAL(6,2))
- `date_full` - Full date in YYYY-MM-DD format (DATE)
- `date_month` - Month number 1-12 (INTEGER)
- `date_week_of` - Week of the year (INTEGER)
- `date_year` - Year (INTEGER)
- `station_city` - Weather station city (VARCHAR(100))
- `station_code` - Weather station 3-letter code (VARCHAR(10))
- `station_location` - Full location description (VARCHAR(200))
- `station_state` - State name (VARCHAR(50))
- `avg_temp` - Average temperature in °F (DECIMAL(5,1))
- `max_temp` - Maximum temperature in °F (DECIMAL(5,1))
- `min_temp` - Minimum temperature in °F (DECIMAL(5,1))
- `wind_direction` - Wind direction in degrees (INTEGER)
- `wind_speed` - Wind speed in mph (DECIMAL(6,2))
- `created_at` - Timestamp when record was inserted (TIMESTAMP, defaults to CURRENT_TIMESTAMP)

## CSV Data Structure

The `weather.csv` file contains weather data with the following columns:
- Data.Precipitation
- Date.Full
- Date.Month
- Date.Week of
- Date.Year
- Station.City
- Station.Code
- Station.Location
- Station.State
- Data.Temperature.Avg Temp
- Data.Temperature.Max Temp
- Data.Temperature.Min Temp
- Data.Wind.Direction
- Data.Wind.Speed

## Usage

### Running the Setup Script

Execute the TypeScript script directly using tsx:

```bash
# From the weather-data-setup directory
tsx setup-weather-data.ts

# Or from the project root
tsx weather-data-setup/setup-weather-data.ts
```

### What the Script Does

The `setup-weather-data.ts` script performs the following operations:

1. **Connects to PostgreSQL** using environment variables or defaults
2. **Drops existing table** if `weather_data` table already exists
3. **Creates new table** with the proper schema (see above)
4. **Reads CSV file** and parses 16,744+ weather records
5. **Loads data in batches** (1,000 records per batch) for memory efficiency
6. **Handles CSV parsing** including quoted values and error handling
7. **Shows progress** every 5,000 records processed
8. **Displays statistics** including:
   - Total records inserted
   - Total records skipped (due to errors)
   - Final count in database
   - Sample records from the loaded data

### Sample Output

```
Creating weather_data table...
Table created successfully!
Loading 16744 records...
Processed 5000 / 16744 lines...
Processed 10000 / 16744 lines...
Processed 15000 / 16744 lines...
Processed 16744 / 16744 lines...

Data loading complete!
Records inserted: 16744
Records skipped: 0
Total records in table: 16744

Sample records:
Birmingham, Alabama | 2016-01-03 | Temp: 39°F | Precip: 0"
Huntsville, Alabama | 2016-01-03 | Temp: 39°F | Precip: 0"
Mobile, Alabama | 2016-01-03 | Temp: 46°F | Precip: 0.16"
Montgomery, Alabama | 2016-01-03 | Temp: 45°F | Precip: 0"
Anchorage, Alaska | 2016-01-03 | Temp: 34°F | Precip: 0.01"
```

### Prerequisites

1. **PostgreSQL database** running and accessible
2. **Environment variables** configured (or using defaults):
   - `POSTGRES_HOST` (default: localhost)
   - `POSTGRES_PORT` (default: 5432)
   - `POSTGRES_DATABASE` (default: postgres)
   - `POSTGRES_USER` (default: postgres)
   - `POSTGRES_PASSWORD` (default: empty)
3. **tsx** installed (`npm install -g tsx` or use npx)

### Environment Setup

Create a `.env` file in the project root with your database configuration:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=mcp_db
POSTGRES_USER=mcp_user
POSTGRES_PASSWORD=mcp_password
```

## Data Characteristics

- **Date Range**: 2016 weather data
- **Geographic Coverage**: All US states including Alaska and Hawaii
- **Record Count**: 16,744+ weather observations
- **Weather Stations**: Major cities across the United States
- **Data Points**: Temperature, precipitation, wind speed/direction by date

## Error Handling

The script includes robust error handling:
- Skips malformed CSV lines
- Handles missing or invalid data gracefully
- Provides detailed error messages
- Shows counts of successful vs. skipped records
- Processes data in batches to handle large datasets efficiently

## Using with MCP Server

Once the weather data is loaded, you can query it using the PostgreSQL MCP server tools:

```
@postgres-mcp-server list_tables
@postgres-mcp-server describe_table for table "weather_data"
@postgres-mcp-server query_database with sql "SELECT * FROM weather_data WHERE station_state = 'California' LIMIT 10"
```


