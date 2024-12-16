import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {exec} from 'child_process'

const audioExtensions = ['.mid', '.wav'];

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
    const audioFile = data.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, message: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate audio file extension
    const fileName = audioFile.name;
    const fileExtension = path.extname(fileName).toLowerCase();

    if (!audioExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, message: 'Invalid audio file type' },
        { status: 400 }
      );
    }

    // Prepare upload directory
    const audioPath = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value, 'query', 'audio');

    await ensureDirectoryExists(audioPath);
    await clearFolderContents(audioPath);

    // Save the audio file
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
    let newFileName = "input.mid";
    if (fileExtension === '.wav') {
      newFileName = "input.wav";
    }
    const savedFilePath = path.join(audioPath, newFileName);
    await fs.writeFile(savedFilePath, fileBuffer as any);

    if(fileExtension === '.wav'){
      exec(`python src/processWavToMidi.py --path ${savedFilePath} --folder ${audioPath}`, (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
        }
        else if (stderr) {
          console.log(`stderr: ${stderr}`);
        }
        else {
          console.log(stdout);
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Audio uploaded successfully',
      fileName,
      savedFilePath,
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing audio upload',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}