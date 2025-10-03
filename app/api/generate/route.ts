import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const processedImage = await sharp(buffer)
      .resize(413, 531, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 95 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${processedImage.toString('base64')}`;
    return NextResponse.json({ image: base64 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}