import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type MapperEntry = {
  audio_file: string;
  pic_name: string;
  audio_similarity?: number | null;
  image_distance?: number | null;
};

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID not found' },
      { status: 401 }
    );
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'temp_uploads', sessionId.value);
  const imageDir = path.join(uploadsDir, 'images');
  const audioDir = path.join(uploadsDir, 'audio');
  const mapperFilePath = path.join(uploadsDir, 'mapper.json');

  try {
    const rawData = await fs.readFile(mapperFilePath, 'utf-8');
    const mapper: MapperEntry[] = JSON.parse(rawData);

    if (!Array.isArray(mapper)) {
      return NextResponse.json(
        { success: false, message: 'Invalid mapper.json format' },
        { status: 500 }
      );
    }

    // Get images and audio files in the upload directory
    const images = await fs.readdir(imageDir);
    const audio = await fs.readdir(audioDir);

    // Map and filter the dataset based on existing files and mapper data
    const dataset = mapper
      .map((entry: MapperEntry) => {
        const imageExists = images.includes(entry.pic_name);
        const audioExists = audio.includes(entry.audio_file);

        if (imageExists && audioExists) {
          return {
            song: entry.audio_file,
            cover: entry.pic_name,
            audio_similarity: entry.audio_similarity ?? null,
            image_distance: entry.image_distance ?? null,
          };
        }
        return null;
      })
      .filter((entry): entry is {
        song: string;
        cover: string;
        audio_similarity: number | null;
        image_distance: number | null;
      } => entry !== null);

    if (dataset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No matching data found for audio and image files',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dataset,
    });
  } catch (error) {
    console.error('Error fetching data:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
