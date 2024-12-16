import { NextRequest, NextResponse } from "next/server";
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

export async function GET(request: NextRequest) {
    const sessionId = request.cookies.get('sessionId');
  
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID not found' },
        { status: 401 }
      );
    }
    
    const mapperDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value);
    const mapperDestination = path.join(mapperDir, 'mapper.json');
    const mapperPath = path.join(mapperDir, 'copy_mapper.json');

    try {
        await fs.copyFile(mapperPath, mapperDestination);
        await fs.unlink(mapperPath);
        console.log(`mapper.json copied to ${mapperDestination}`);
      } catch (error) {
        console.error('Error copying mapper.json:', error);
        return NextResponse.json(
          { success: false, message: 'Error copying mapper.json' },
          { status: 500 }
        );
      }
    
    return NextResponse.json({
    success: true,
    message: "Query API is working",
    });

}