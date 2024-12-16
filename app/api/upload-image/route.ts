import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const imageExtensions = ['.jpg', '.jpeg', '.png'];

async function ensureDirectoryExists(dir: string) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function clearFolderContents(dir: string) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  }
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID not found' },
      { status: 401 }
    );
  }

  try {
    const data = await request.formData();
    const imageFile = data.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, message: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate image file extension
    const fileName = imageFile.name;
    const fileExtension = path.extname(fileName).toLowerCase();

    if (!imageExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, message: 'Invalid image file type' },
        { status: 400 }
      );
    }

    // Prepare upload directory
    const imagePath = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value, 'query', 'image');
    // const imagePath = path.join(uploadsDir, 'images');

    // await ensureDirectoryExists(uploadsDir); 
    await ensureDirectoryExists(imagePath);

    await clearFolderContents(imagePath);

    // Save the image file
    const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
    const newFileName = "input.png";
    const savedFilePath = path.join(imagePath, newFileName);
    await fs.writeFile(savedFilePath, fileBuffer as any);

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      fileName,
      savedFilePath,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing image upload',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
