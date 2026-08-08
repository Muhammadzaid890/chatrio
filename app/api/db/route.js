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
    const result = await sql`SELECT NOW()`;
    return NextResponse.json({ 
      status: 'success', 
      message: '✅ Neon Database Connected Successfully!', 
      serverTime: result[0]?.now 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message || 'Failed to connect to Neon DB' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { sql: sqlQuery, params = [] } = body;

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      console.error('DATABASE_URL environment variable is missing');
      return NextResponse.json({ 
        error: 'DATABASE_URL is missing in Vercel Environment Variables. Please add it in Vercel Settings and Redeploy.' 
      }, { status: 500 });
    }

    const sql = neon(dbUrl);
    const rows = await sql(sqlQuery, params);

    return NextResponse.json({ rows: rows || [] });
  } catch (error) {
    console.error('Neon DB API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Database Query Error', 
      detail: String(error) 
    }, { status: 500 });
  }
}