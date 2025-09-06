# Use Ubuntu 22.04 as base image
FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Set environment variables for PostgreSQL
ENV POSTGRES_USER=mcp_user
ENV POSTGRES_PASSWORD=mcp_password
ENV POSTGRES_DB=mcp_db
ENV PGDATA=/var/lib/postgresql/data

# Update package list and install PostgreSQL and Node.js
RUN apt-get update && \
    apt-get install -y \
    postgresql \
    postgresql-contrib \
    sudo \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Install TypeScript and ts-node globally
RUN npm install -g typescript ts-node

# Create data directory
RUN mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql/data && \
    chmod 700 /var/lib/postgresql/data

# Initialize PostgreSQL database
RUN sudo -u postgres /usr/lib/postgresql/*/bin/initdb -D /var/lib/postgresql/data

# Configure PostgreSQL
RUN echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf && \
    echo "listen_addresses='*'" >> /var/lib/postgresql/data/postgresql.conf

# Start PostgreSQL, create user and database
RUN sudo -u postgres /usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start && \
    sleep 5 && \
    sudo -u postgres psql -c "CREATE USER $POSTGRES_USER WITH SUPERUSER PASSWORD '$POSTGRES_PASSWORD';" && \
    sudo -u postgres psql -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;" && \
    sudo -u postgres /usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data stop

# Expose the PostgreSQL port
EXPOSE 5432

# Add health check to ensure PostgreSQL is ready
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB

# Create startup script
RUN echo '#!/bin/bash\n\
# Stop any existing PostgreSQL service\n\
service postgresql stop 2>/dev/null || true\n\
# Start PostgreSQL with custom configuration\n\
sudo -u postgres /usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start\n\
echo "PostgreSQL started with custom configuration"\n\
tail -f /var/lib/postgresql/data/logfile' > /start-postgres.sh && \
    chmod +x /start-postgres.sh

# Start PostgreSQL by default
CMD ["/start-postgres.sh"]
