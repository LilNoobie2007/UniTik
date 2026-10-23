// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Incoming ${request.method} request to ${request.nextUrl.pathname}`);
    return NextResponse.next();
}

export const config = {
    matcher: '/:path*', // Applies to all routes
};