#!/bin/bash

# Initialize and start PostgreSQL with proper configuration
echo "Starting PostgreSQL with custom configuration..."

# Stop any running PostgreSQL instances
sudo service postgresql stop 2>/dev/null || true

# Start PostgreSQL with custom data directory
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until sudo -u postgres pg_isready -h localhost -p 5432; do
  echo "PostgreSQL is not ready yet..."
  sleep 1
done

echo "PostgreSQL is running with mcp_user and mcp_db configured!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: mcp_user"
echo "  Password: mcp_password"
echo "  Database: mcp_db"
