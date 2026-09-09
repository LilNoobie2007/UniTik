import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📦 BFF: Request body:", body); 

    // Dynamically route to port 8080 and drop the '/backend' prefix
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    
    const response = await fetch(`${API_BASE}/modules/ticketing/book.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    return NextResponse.json(data, { 
      status: response.ok ? 200 : response.status 
    });

  } catch (error) {
    console.error("❌ BFF Error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to connect to PHP backend." }, 
      { status: 500 }
    );
  }
}