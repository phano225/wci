import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'public/logo.png';
const outputDir = 'public';

async function generateIcons() {
  if (!fs.existsSync(input)) {
    console.error('Logo not found:', input);
    return;
  }

  const sizes = [192, 512];
  
  for (const size of sizes) {
    await sharp(input)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(path.join(outputDir, `pwa-${size}x${size}.png`));
      
    console.log(`Generated pwa-${size}x${size}.png`);
    
    // Generate maskable icon (padding added for maskable)
    await sharp(input)
      .resize(Math.round(size * 0.8), Math.round(size * 0.8), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: Math.round(size * 0.1),
        bottom: Math.round(size * 0.1),
        left: Math.round(size * 0.1),
        right: Math.round(size * 0.1),
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(outputDir, `pwa-maskable-${size}x${size}.png`));
      
    console.log(`Generated pwa-maskable-${size}x${size}.png`);
  }
  
  // Apple touch icon
  await sharp(input)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile(path.join(outputDir, `apple-touch-icon.png`));
    
  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
