import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
    const cookies = request.headers.get('cookie');
    const existingSessionId = cookies?.match(/sessionId=([^;]*)/)?.[1];

    if (existingSessionId) {
        // If session already exists, return it
        return NextResponse.json({ sessionId: existingSessionId });
    }

    const sessionId = randomUUID(); // Generate a new session ID
    const response = NextResponse.json({ sessionId });

    // Set the session ID as a cookie
    response.cookies.set('sessionId', sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 86400, // 24 hours
    });

    return response;
}
