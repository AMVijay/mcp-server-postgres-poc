# PostgreSQL MCP Server - Proof of Concept

A Model Context Protocol (MCP) server implementation for querying PostgreSQL databases. This proof of concept demonstrates how to create an MCP server that can interact with PostgreSQL databases, providing a bridge between AI models and structured database content.

## Overview

This project showcases the integration of the Model Context Protocol with PostgreSQL databases, enabling AI models to query and interact with database content in a structured and secure manner. The server provides tools for executing SQL queries, listing database schemas, and managing database connections.

## Features

- **SQL Query Execution**: Execute SELECT queries (read-only operations for security)
- **Schema Introspection**: List tables, columns, and database structure


## Quick Start

### Prerequisites

- Node.js 22 
- PostgreSQL database
- TypeScript knowledge

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-server-postgres-poc
```

2. Install dependencies:
```bash
npm install
```

3. Set up test data (for testing purposes):
```bash
# Start PostgreSQL service
./init_postgres.sh

# Set up sample weather data
cd weather-data-setup
npx tsx setup-weather-data.ts
cd ..
```

4. Configure your database connection by creating a `.env` file:
```env
POSTGRES_USER=your_username
POSTGRES_HOST=localhost
POSTGRES_DATABASE=your_database
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432
POSTGRES_MAX_CONNECTIONS=10
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=10000
```

5. Build the project:
```bash
npm run build
```

6. Start the MCP server:
```bash
npm start
```

## Available Tools

The MCP server provides the following tools:

### `query`
Execute SQL queries against the PostgreSQL database.

**Parameters:**
- `sql` (string): The SQL query to execute
- `params` (array, optional): Parameters for parameterized queries

### `list_tables`
List all tables in the database.

**Parameters:**
- `schema` (string, optional): Database schema name (default: "public")

### `describe_table`
Get detailed information about a specific table's structure.

**Parameters:**
- `schema` (string, optional): Database schema name (default: "public")
- `table` (string): Table name to describe

## Sample Data

This POC includes a weather data setup to demonstrate the server's capabilities:

### Weather Data
The `weather-data-setup/` directory contains:
- **weather.csv**: Historical weather data from US weather stations (16,744+ records)
- **setup-weather-data.ts**: Script to create and populate the weather database

To set up the sample data:
```bash
cd weather-data-setup
npx tsx setup-weather-data.ts
```

This creates a `weather_data` table with fields including temperature, precipitation, wind data, and station information.

## Development

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with tsx
- `npm run watch` - Run in watch mode for development
- `npm run clean` - Clean build artifacts

### Project Structure

```
src/
├── generic-postgres-mcp.ts    # Main MCP server implementation
weather-data-setup/
├── README.md                  # Weather data documentation
├── setup-weather-data.ts      # Database setup script
└── weather.csv               # Sample weather data
```

## Configuration

The server supports the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | postgres | Database username |
| `POSTGRES_HOST` | localhost | Database host |
| `POSTGRES_DATABASE` | postgres | Database name |
| `POSTGRES_PASSWORD` | (empty) | Database password |
| `POSTGRES_PORT` | 5432 | Database port |
| `POSTGRES_MAX_CONNECTIONS` | 10 | Maximum connection pool size |
| `POSTGRES_IDLE_TIMEOUT` | 30000 | Idle connection timeout (ms) |
| `POSTGRES_CONNECTION_TIMEOUT` | 10000 | Connection timeout (ms) |

## Security Considerations

- Always use parameterized queries to prevent SQL injection
- Limit database user permissions to only necessary operations
- Use connection pooling to manage database resources efficiently
- Validate and sanitize all input parameters
- Consider implementing query timeouts for long-running operations

## Integration with MCP Clients

This server can be integrated with any MCP-compatible client, such as Claude Desktop or other AI applications that support the Model Context Protocol.

Example MCP client configuration:
```json
{
  "mcpServers": {
    "postgres-server": {
      "command": "node",
      "args": ["/path/to/dist/generic-postgres-mcp.js"],
      "env": {
        "POSTGRES_USER": "your_username",
        "POSTGRES_HOST": "localhost",
        "POSTGRES_DATABASE": "your_database",
        "POSTGRES_PASSWORD": "your_password"
      }
    }
  }
}
```

## Contributing

This is a proof of concept project. Contributions, suggestions, and improvements are welcome! Please feel free to:

- Report issues
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Next Steps

This POC demonstrates the basic functionality of an MCP server for PostgreSQL. Potential enhancements include:

- Advanced query builders and ORM integration
- Database migration support
- Multi-database support
- Enhanced security features
- Performance monitoring and metrics
- Streaming query results for large datasets
- Transaction management
