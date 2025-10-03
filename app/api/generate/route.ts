import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

const PHOTO_WIDTH_MM = 35;
const PHOTO_HEIGHT_MM = 45;
const DPI = 300;
const MM_TO_INCH = 25.4;
const PHOTO_WIDTH_PX = Math.round((PHOTO_WIDTH_MM / MM_TO_INCH) * DPI);
const PHOTO_HEIGHT_PX = Math.round((PHOTO_HEIGHT_MM / MM_TO_INCH) * DPI);
const MAX_RETRIES = 3;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 前処理
    const processedImage = await sharp(buffer)
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Nano Banana APIで背景削除
    const editedImage = await callNanoBananaAPI(processedImage);

    // 証明写真サイズにトリミング
    const finalImage = await sharp(editedImage)
      .resize(PHOTO_WIDTH_PX, PHOTO_HEIGHT_PX, {
        fit: 'cover',
        position: 'attention'
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    const base64Result = `data:image/jpeg;base64,${finalImage.toString('base64')}`;
    return NextResponse.json({ image: base64Result });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

async function callNanoBananaAPI(imageBuffer: Buffer): Promise<Buffer> {
  const prompt = `Edit this photo for an ID/passport photo:
- Remove the entire background completely
- Replace background with pure solid white color (#FFFFFF)
- Keep the person's face centered and clearly visible
- Ensure proper lighting and clarity
- Maintain natural facial proportions
- Make it suitable for official ID photo standards

Return only the edited image.`;

  const base64Image = imageBuffer.toString('base64');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Nano Banana API attempt ${attempt}/${MAX_RETRIES}`);

      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
      });

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
      ]);

      const response = result.response;
      const imageData = extractImageFromResponse(response);
      
      if (imageData) {
        console.log('Successfully got image from Nano Banana API');
        return imageData;
      }

      throw new Error('No valid image data in response');

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        console.log('Max retries reached, using fallback');
        return await applyWhiteBackground(imageBuffer);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }

  return imageBuffer;
}

function extractImageFromResponse(response: any): Buffer | null {
  try {
    const candidates = response.candidates;
    if (candidates && candidates[0]) {
      const parts = candidates[0].content.parts;
      
      for (const part of parts) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
        
        if (part.text) {
          const base64Match = part.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
          if (base64Match) {
            return Buffer.from(base64Match[1], 'base64');
          }
        }
      }
    }

    const text = response.text?.() || '';
    if (text.includes('base64')) {
      const base64Match = text.match(/([A-Za-z0-9+/=]{100,})/);
      if (base64Match) {
        try {
          return Buffer.from(base64Match[1], 'base64');
        } catch (e) {
          console.error('Failed to decode base64:', e);
        }
      }
    }

  } catch (error) {
    console.error('Error extracting image:', error);
  }

  return null;
}

async function applyWhiteBackground(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 1200;

    const whiteBackground = await sharp({
      create: {
        width: width,
        height: height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .jpeg()
    .toBuffer();

    return await sharp(whiteBackground)
      .composite([{
        input: imageBuffer,
        gravity: 'center'
      }])
      .jpeg({ quality: 95 })
      .toBuffer();

  } catch (error) {
    console.error('Error applying white background:', error);
    return imageBuffer;
  }
}
