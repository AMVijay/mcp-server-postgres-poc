#!/bin/bash

# Initialize and start PostgreSQL with proper configuration
echo "Starting PostgreSQL with custom configuration..."

# Stop any running PostgreSQL instances
sudo service postgresql stop 2>/dev/null || true

# Start PostgreSQL service
sudo service postgresql start

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until sudo -u postgres pg_isready -h localhost -p 5432; do
  echo "PostgreSQL is not ready yet..."
  sleep 1
done

# Create database and user if they don't exist
echo "Setting up database and user..."
sudo -u postgres psql -c "CREATE DATABASE mcp_db;" 2>/dev/null || echo "Database mcp_db already exists"
sudo -u postgres psql -c "CREATE USER mcp_user WITH PASSWORD 'mcp_password';" 2>/dev/null || echo "User mcp_user already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mcp_db TO mcp_user;" 2>/dev/null || echo "Privileges already granted"

echo "PostgreSQL is running with mcp_user and mcp_db configured!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: mcp_user"
echo "  Password: mcp_password"
echo "  Database: mcp_db"
