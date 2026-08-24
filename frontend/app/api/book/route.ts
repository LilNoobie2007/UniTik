// frontend/app/api/book/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("🚀 BFF: Received request!"); // ADD THIS
  try {
    const body = await request.json();
    console.log("📦 BFF: Request body:", body); // ADD THIS

    const response = await fetch('http://localhost:8000/backend/modules/ticketing/book.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ BFF Error:", error);
    return NextResponse.json({ status: 'error', message: 'Failed' }, { status: 500 });
  }
}