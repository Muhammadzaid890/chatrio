import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

async function ensureCorrectSchema(sql) {
  try {
    // 1. Users Table
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

    await sql.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='id' AND (data_type LIKE '%int%' OR data_type LIKE '%numeric%')
        ) THEN 
          DROP TABLE IF EXISTS calls CASCADE;
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

    await sql.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        text TEXT,
        image TEXT,
        reaction TEXT DEFAULT '',
        reply_to_id INTEGER DEFAULT NULL,
        reply_to_text TEXT DEFAULT '',
        is_deleted_everyone BOOLEAN DEFAULT FALSE,
        deleted_by_users TEXT DEFAULT '',
        seen_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image TEXT;`);
    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reaction TEXT DEFAULT '';`);
    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER DEFAULT NULL;`);
    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_text TEXT DEFAULT '';`);
    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted_everyone BOOLEAN DEFAULT FALSE;`);
    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by_users TEXT DEFAULT '';`);
    await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP;`);

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

    await sql.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        caller_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        call_type TEXT NOT NULL,
        status TEXT DEFAULT 'ringing',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Auto schema migration error:', err);
  }
}

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
      message: '✅ Chatrio by ED Database Schema & Call Signaling fully updated!', 
      serverTime: result[0]?.now 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message || 'Failed to connect/fix Neon DB' 
    }, { status: 500 });
  }
}

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
      if (
        String(queryErr).includes('invalid input syntax for type integer') || 
        String(queryErr).includes('does not exist') ||
        String(queryErr).includes('column')
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