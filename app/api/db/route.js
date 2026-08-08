import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { sql: sqlQuery, params = [] } = body;

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      console.error('DATABASE_URL environment variable is missing');
      return NextResponse.json({ error: 'DATABASE_URL missing' }, { status: 500 });
    }

    const sql = neon(dbUrl);
    const rows = await sql(sqlQuery, params);

    return NextResponse.json({ rows: rows || [] });
  } catch (error) {
    console.error('Neon DB API Error:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
