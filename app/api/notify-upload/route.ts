import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {

  const sessionId = request.cookies.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID not found' },
      { status: 401 }
    );
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value);
  const imagePath = path.join(uploadsDir, 'images');
  const audioPath = path.join(uploadsDir, 'audio');
  const mapperFilePath = path.join(uploadsDir, 'mapper.json');

  const stream = new ReadableStream({
    start(controller) {
      const checkFilesExist = async () => {
        try {
          const images = await fs.readdir(imagePath);
          const audio = await fs.readdir(audioPath);
          const mapperExists = await fs.access(mapperFilePath).then(() => true).catch(() => false);

          if (images.length > 0 && audio.length > 0 && mapperExists) {
            controller.enqueue('data: {"status": "file-uploaded", "message": "Dataset dan mapper berhasil diupload"}\n\n');
          } else {
            controller.enqueue('data: {"status": "uploading", "message": "Dataset dan mapper sedang diproses"}\n\n');
          }
        } catch (error) {
          console.error('Error checking files:', error);
        }
      };

      // Periksa status setiap beberapa detik
      const interval = setInterval(() => {
        checkFilesExist();
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
