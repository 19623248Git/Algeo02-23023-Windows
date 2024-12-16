import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {

    const sessionId = req.cookies.get('sessionId');

    if (!sessionId) {
        return NextResponse.json(
        { success: false, message: 'Session ID not found' },
        { status: 401 }
        );
    }
  // Define the session ID or default path structure
//   const sessionId = 'default_session'; // Replace with a hardcoded or derived value as needed

  // Define the file path
  const filePath = path.join(process.cwd(),'public' ,'temp_uploads', sessionId.value, 'time.txt');

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    try {
      // Read the file content
      const content = fs.readFileSync(filePath, 'utf-8');

      // Return the file content in the response
      return NextResponse.json({ content });
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json({ error: 'Failed to read file.' }, { status: 500 });
    }
  } else {
    // File does not exist
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }
}
