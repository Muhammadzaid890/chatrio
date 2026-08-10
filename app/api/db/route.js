import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

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

    // Auto-fix table structures directly on the connected Vercel database
    await sql.query(`DROP TABLE IF EXISTS messages CASCADE;`);
    await sql.query(`DROP TABLE IF EXISTS users CASCADE;`);

    await sql.query(`
      CREATE TABLE users (
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
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    return NextResponse.json({ 
      status: 'success', 
      message: '✅ Neon Database Reset & Re-created Successfully with TEXT ID support!' 
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
    if (typeof sql.query === 'function') {
      rows = await sql.query(sqlQuery, params);
    } else {
      rows = await sql(sqlQuery, params);
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