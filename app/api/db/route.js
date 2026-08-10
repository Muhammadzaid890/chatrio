import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

/**
 * Ensures required tables (users, messages, requests) exist in Neon DB
 * and automatically repairs column type mismatches (e.g. text ID vs integer ID).
 */
async function ensureCorrectSchema(sql) {
  try {
    // 1. Create users table if not exists
    await sql.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        bio TEXT,
        last_seen TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Auto-repair schema if users.id was mistakenly created as an integer
    await sql.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='id' AND (data_type LIKE '%int%' OR data_type LIKE '%numeric%')
        ) THEN 
          DROP TABLE IF EXISTS messages CASCADE;
          DROP TABLE IF EXISTS requests CASCADE;
          DROP TABLE IF EXISTS users CASCADE;
          
          CREATE TABLE users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT,
            bio TEXT,
            last_seen TIMESTAMP DEFAULT NOW()
          );
        END IF;
      END $$;
    `);

    // 3. Create messages table if not exists
    await sql.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        text TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4. Create friend/chat requests table if not exists
    await sql.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_friendship UNIQUE (sender_id, receiver_id)
      );
    `);
  } catch (err) {
    console.error('Auto schema fix error:', err);
  }
}

/**
 * GET Handler - Used for diagnostic health check and auto-fixing DB schema
 */
export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'DATABASE_URL environment variable is missing in Vercel settings.' 
      }, { status: 500 });
    }

    const sql = neon(dbUrl);
    await ensureCorrectSchema(sql);

    const result = await sql.query(`SELECT NOW()`);
    return NextResponse.json({ 
      status: 'success', 
      message: '✅ Chatrio by ED - Database Connected & Schema Auto-Fixed Successfully!', 
      serverTime: result[0]?.now 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message || 'Failed to connect/fix Neon DB' 
    }, { status: 500 });
  }
}

/**
 * POST Handler - Executes dynamic SQL queries sent by the frontend
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sql: sqlQuery, params = [] } = body;

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return NextResponse.json({ 
        error: 'DATABASE_URL is missing in Vercel Environment Variables.' 
      }, { status: 500 });
    }

    const sql = neon(dbUrl);
    
    let rows;
    try {
      if (typeof sql.query === 'function') {
        rows = await sql.query(sqlQuery, params);
      } else {
        rows = await sql(sqlQuery, params);
      }
    } catch (queryErr) {
      // Auto-repair schema if table or type mismatch error occurs, then retry
      if (
        String(queryErr).includes('invalid input syntax for type integer') || 
        String(queryErr).includes('does not exist')
      ) {
        console.log('Auto-repairing Chatrio database schema...');
        await ensureCorrectSchema(sql);
        if (typeof sql.query === 'function') {
          rows = await sql.query(sqlQuery, params);
        } else {
          rows = await sql(sqlQuery, params);
        }
      } else {
        throw queryErr;
      }
    }

    return NextResponse.json({ rows: rows || [] });
  } catch (error) {
    console.error('Neon DB API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Database Query Error', 
      detail: String(error) 
    }, { status: 500 });
  }
}