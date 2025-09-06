#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Pool, PoolClient } from "pg";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validation schemas
const QuerySchema = z.object({
  sql: z.string().min(1, "SQL query cannot be empty"),
  params: z.array(z.any()).optional().default([]),
});

const TableSchema = z.object({
  schema: z.string().optional().default("public"),
  table: z.string().optional(),
});

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

class PostgresMCPServer {
  private server: Server;
  private pool: Pool;

  constructor() {
    this.server = new Server(
      {
        name: "postgres-mcp-server",
        version: "1.0.0",
        description: "MCP server for querying PostgreSQL databases",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pool = new Pool(dbConfig);
    this.setupErrorHandling();
    this.setupToolHandlers();
  }

  private setupErrorHandling(): void {
    this.pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });

    process.on("SIGINT", async () => {
      console.log("Shutting down gracefully...");
      await this.pool.end();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down gracefully...");
      await this.pool.end();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "query_database",
          description: "Execute a SQL query against the PostgreSQL database",
          inputSchema: {
            type: "object",
            properties: {
              sql: {
                type: "string",
                description: "The SQL query to execute",
              },
              params: {
                type: "array",
                description: "Optional parameters for the SQL query (for prepared statements)",
                items: {
                  type: "string",
                },
                default: [],
              },
            },
            required: ["sql"],
          },
        },
        {
          name: "list_tables",
          description: "List all tables in the database or a specific schema",
          inputSchema: {
            type: "object",
            properties: {
              schema: {
                type: "string",
                description: "Schema name to list tables from",
                default: "public",
              },
            },
          },
        },
        {
          name: "describe_table",
          description: "Get the structure/schema of a specific table",
          inputSchema: {
            type: "object",
            properties: {
              table: {
                type: "string",
                description: "Name of the table to describe",
              },
              schema: {
                type: "string",
                description: "Schema name where the table is located",
                default: "public",
              },
            },
            required: ["table"],
          },
        },
        {
          name: "get_table_data",
          description: "Get sample data from a table with optional limit",
          inputSchema: {
            type: "object",
            properties: {
              table: {
                type: "string",
                description: "Name of the table to query",
              },
              schema: {
                type: "string",
                description: "Schema name where the table is located",
                default: "public",
              },
              limit: {
                type: "number",
                description: "Maximum number of rows to return",
                default: 10,
              },
            },
            required: ["table"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "query_database":
            return await this.executeQuery(args);

          case "list_tables":
            return await this.listTables(args);

          case "describe_table":
            return await this.describeTable(args);

          case "get_table_data":
            return await this.getTableData(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        console.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async executeQuery(args: any) {
    const validation = QuerySchema.safeParse(args);
    if (!validation.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${validation.error.message}`
      );
    }

    const { sql, params } = validation.data;
    
    // Basic SQL injection protection - block common dangerous operations
    const dangerousPatterns = [
      /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\s+/i,
    ];
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(sql));
    if (isDangerous && !sql.trim().toLowerCase().startsWith('select')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Only SELECT queries are allowed for security reasons"
      );
    }

    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      const result = await client.query(sql, params);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              rows: result.rows,
              rowCount: result.rowCount,
              fields: result.fields?.map(field => ({
                name: field.name,
                dataTypeID: field.dataTypeID,
              })),
            }, null, 2),
          },
        ],
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async listTables(args: any) {
    const validation = TableSchema.safeParse(args);
    if (!validation.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${validation.error.message}`
      );
    }

    const { schema } = validation.data;

    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      const result = await client.query(
        `SELECT table_name, table_type 
         FROM information_schema.tables 
         WHERE table_schema = $1 
         ORDER BY table_name`,
        [schema]
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              schema,
              tables: result.rows,
            }, null, 2),
          },
        ],
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async describeTable(args: any) {
    const validation = TableSchema.required({ table: true }).safeParse(args);
    if (!validation.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${validation.error.message}`
      );
    }

    const { schema, table } = validation.data;

    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      
      // Get column information
      const columnsResult = await client.query(
        `SELECT 
           column_name,
           data_type,
           is_nullable,
           column_default,
           character_maximum_length,
           numeric_precision,
           numeric_scale
         FROM information_schema.columns 
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, table]
      );

      // Get constraints information
      const constraintsResult = await client.query(
        `SELECT 
           tc.constraint_name,
           tc.constraint_type,
           kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu 
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_schema = $1 AND tc.table_name = $2`,
        [schema, table]
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              table: `${schema}.${table}`,
              columns: columnsResult.rows,
              constraints: constraintsResult.rows,
            }, null, 2),
          },
        ],
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async getTableData(args: any) {
    const schema = z.object({
      table: z.string().min(1, "Table name cannot be empty"),
      schema: z.string().optional().default("public"),
      limit: z.number().positive().optional().default(10),
    });

    const validation = schema.safeParse(args);
    if (!validation.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${validation.error.message}`
      );
    }

    const { table, schema: schemaName, limit } = validation.data;

    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      
      // Safely construct the query with schema and table names
      const result = await client.query(
        `SELECT * FROM ${schemaName}.${table} LIMIT $1`,
        [limit]
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              table: `${schemaName}.${table}`,
              limit,
              rowCount: result.rowCount,
              data: result.rows,
            }, null, 2),
          },
        ],
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async run(): Promise<void> {
    // Test database connection
    try {
      const client = await this.pool.connect();
      console.log("✅ Database connection successful");
      client.release();
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      console.error("Please check your database configuration in .env file");
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("🚀 PostgreSQL MCP Server running on stdio");
  }
}

// Start the server
const server = new PostgresMCPServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
