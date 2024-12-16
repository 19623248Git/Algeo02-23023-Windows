import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import {exec} from 'child_process'

const imageExtensions = ['.jpg', '.jpeg', '.png'];
const audioExtensions = ['.mp3', '.wav', '.mid', '.midi'];

async function getAllFiles(dir: string): Promise<string[]> {
  let files = await fs.readdir(dir, { withFileTypes: true });
  let allFiles: string[] = [];
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      allFiles = allFiles.concat(await getAllFiles(fullPath));
    } else {
      allFiles.push(fullPath);
    }
  }
  return allFiles;
}

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
    const coverZipFile = data.get('cover') as File | null;
    const musicZipFile = data.get('music') as File | null;

    if (!coverZipFile || !musicZipFile) {
      return NextResponse.json(
        { success: false, message: 'Both cover and music datasets are required' },
        { status: 400 }
      );
    }

    // Buat direktori utama dan subfolder jika belum ada
    const uploadsDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value);
    const imagePath = path.join(uploadsDir, 'images');
    const audioPath = path.join(uploadsDir, 'audio');

    await ensureDirectoryExists(uploadsDir);  
    await ensureDirectoryExists(imagePath);   
    await ensureDirectoryExists(audioPath);   

    await clearFolderContents(imagePath);
    await clearFolderContents(audioPath);

    // Proses Cover
    const coverProcess = async () => {
      // Proses file ZIP Cover
      const coverZipBytes = await coverZipFile.arrayBuffer();
      const coverZip = new AdmZip(Buffer.from(coverZipBytes));

      // Validasi isi ZIP Cover
      if (coverZip.getEntries().length === 0) {
        return NextResponse.json(
          { success: false, message: 'Cover ZIP file is empty' },
          { status: 400 }
        );
      }

      // Ekstrak file ZIP Cover
      const coverExtractDir = path.join(uploadsDir, 'temp_cover_' + Date.now());
      coverZip.extractAllTo(coverExtractDir, true);

      const coverFiles = await getAllFiles(coverExtractDir);
      const processedCoverFiles: string[] = [];

      // Validasi file dalam ZIP apakah semuanya audio
      const isCoverFilesValid = coverFiles.every(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);  // Pastikan ekstensi file audio valid
      });

      // Jika ada file selain audio, hentikan proses dan beri pesan kesalahan
      if (!isCoverFilesValid) {
        await fs.rm(coverExtractDir, { recursive: true, force: true }); // Hapus direktori sementara
        throw new Error('cover ZIP contains non-image files. Please upload only image files.');
      }

      for (const file of coverFiles) {
        const originalFileName = path.basename(file); 

        await fs.rename(file, path.join(imagePath, originalFileName)); 
        processedCoverFiles.push(originalFileName);
        
      }

      // Hapus direktori sementara cover
      try {
        await fs.rm(coverExtractDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to clean up cover extraction directory:', cleanupError);
      }

      return processedCoverFiles
    }
    
    // Proses Music
    const musicProcess = async () => {
      // Proses file ZIP Music
      const musicZipBytes = await musicZipFile.arrayBuffer();
      const musicZip = new AdmZip(Buffer.from(musicZipBytes));

      // Validasi isi ZIP Music
      if (musicZip.getEntries().length === 0) {
        return NextResponse.json(
          { success: false, message: 'Music ZIP file is empty' },
          { status: 400 }
        );
      }

      // Ekstrak file ZIP Music
      const musicExtractDir = path.join(uploadsDir, 'temp_music_' + Date.now());
      musicZip.extractAllTo(musicExtractDir, true);

      const musicFiles = await getAllFiles(musicExtractDir);
      const processedMusicFiles: string[] = [];

      // Validasi file dalam ZIP apakah semuanya audio
      const isMusicFilesValid = musicFiles.every(file => {
        const ext = path.extname(file).toLowerCase();
        console.log('Checking file extension:', ext); 
        return audioExtensions.includes(ext);  // Pastikan ekstensi file audio valid
      });

      // Jika ada file selain audio, hentikan proses dan beri pesan kesalahan
      if (!isMusicFilesValid) {
        await fs.rm(musicExtractDir, { recursive: true, force: true }); // Hapus direktori sementara
        throw new Error('music ZIP contains non-audio files. Please upload only audio files.');
      }

      for (const file of musicFiles) {
        const originalFileName = path.basename(file); // Gunakan nama asli file

        await fs.rename(file, path.join(audioPath, originalFileName)); // Pindahkan dengan nama asli
        processedMusicFiles.push(originalFileName);
      }

      // Hapus direktori sementara music
      try {
        await fs.rm(musicExtractDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to clean up music extraction directory:', cleanupError);
      }

      return processedMusicFiles
    }

    const [coverFiles, musicFiles] = await Promise.all([coverProcess(), musicProcess()]);

    exec(`python src/datasetProcess.py --session ${sessionId.value}`, (error, stdout, stderr) => {
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
    
    return NextResponse.json({
      success: true,
      message: 'Datasets extracted and uploaded successfully',
      coverFiles,
      musicFiles,
    });
  } catch (error) {
    console.error('Dataset upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing dataset',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
