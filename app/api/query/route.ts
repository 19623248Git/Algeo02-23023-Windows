import { NextRequest, NextResponse } from "next/server";
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

async function directoryHasFiles(dir: string): Promise<boolean> {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) return true; // Return true if at least one file is found
        }
        return false; // No files found
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return false;
    }
}

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID not found' },
      { status: 401 }
    );
  }

  const queryDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value, 'query');
  const queryDir_image = path.join(queryDir, 'image');
  const queryDir_audio = path.join(queryDir, 'audio');
  const mapperDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value);
  
  await ensureDirectoryExists(queryDir);
  await ensureDirectoryExists(queryDir_image);
  await ensureDirectoryExists(queryDir_audio);

  const hasImageInput = await directoryHasFiles(queryDir_image);
  const hasAudioInput = await directoryHasFiles(queryDir_audio);

  if (!hasImageInput && !hasAudioInput) {
    return NextResponse.json(
      { success: false, message: "Query is still empty" },
      { status: 400 }
    );
  }

  // Copy the mapper.json to the session directory
  const mapperPath = path.join(mapperDir, 'mapper.json');
  const mapperDestination = path.join(mapperDir, 'copy_mapper.json');
  try {
    await fs.copyFile(mapperPath, mapperDestination);
    console.log(`mapper.json copied to ${mapperDestination}`);
  } catch (error) {
    console.error('Error copying mapper.json:', error);
    return NextResponse.json(
      { success: false, message: 'Error copying mapper.json' },
      { status: 500 }
    );
  }

  try {
    const { stdout, stderr } = await execAsync(`python src/retrieval.py --session ${sessionId.value}`);
    console.log('Python stdout:', stdout);
    if (stderr) {
      console.error('Python stderr:', stderr);
    }
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { success: false, message: 'Error executing Python script' },
      { status: 500 }
    );
  }

  await clearFolderContents(queryDir_image);
  await clearFolderContents(queryDir_audio);

  return NextResponse.json({
    success: true,
    message: "Query API is working",
  });
}
