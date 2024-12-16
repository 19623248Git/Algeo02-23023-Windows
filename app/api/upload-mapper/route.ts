import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function ensureDirectoryExists(dir: string) {
  try {
    await fs.access(dir);  // Cek apakah folder ada
  } catch (error) {
    // Jika folder tidak ada, buat folder
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("goblog"); // ini apaan woi
    const data = await request.formData();
    const mapperFile = data.get('mapper') as File | null;

    if (!mapperFile) {
      return NextResponse.json({ 
        success: false, 
        message: 'Mapper file is missing' 
      });
    }

    const mapperFileName = mapperFile.name.toLowerCase();
    if (path.extname(mapperFileName) !== '.json') {
      return NextResponse.json({ 
        success: false, 
        message: 'Only .json files are allowed' 
      });
    }

    const sessionId = request.cookies.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID not found' },
        { status: 401 }
      );
    }

    // Buat direktori yang diperlukan jika belum ada
    const uploadsDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value);
    await ensureDirectoryExists(uploadsDir);

    const mapperFilePath = path.join(uploadsDir, 'mapper.json');

    // Hapus file mapper lama jika ada
    try {
      await fs.rm(mapperFilePath);
      console.log('Old mapper file removed');
    } catch (err) {
      console.log('No previous mapper file to remove');
    }

    // Simpan file mapper yang baru
    const mapperBytes = await mapperFile.arrayBuffer();
    await fs.writeFile(mapperFilePath, Buffer.from(mapperBytes));

    return NextResponse.json({
      success: true,
      message: 'Mapper uploaded successfully',
      path: '/uploads/mapper.json'
    });

  } catch (error) {
    console.error('Mapper upload error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error uploading mapper',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
