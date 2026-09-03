/*
 * Local-only team photo optimizer.
 * Reads assets/team, writes assets/team/optimized, and never alters sources.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'assets', 'team');
const outputDir = path.join(sourceDir, 'optimized');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);
const maxDimension = 1000;

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(bytes >= 1024 * 1024 ? 0 : 1)} KB`;
const percentSaved = (original, optimized) => `${((1 - optimized / original) * 100).toFixed(1)}%`;

async function optimizeImage(fileName) {
  const sourcePath = path.join(sourceDir, fileName);
  const baseName = path.parse(fileName).name;
  const webpPath = path.join(outputDir, `${baseName}.webp`);
  const avifPath = path.join(outputDir, `${baseName}.avif`);
  const [sourceStats, metadata] = await Promise.all([fs.stat(sourcePath), sharp(sourcePath).metadata()]);

  // rotate() applies EXIF orientation, then resize keeps aspect ratio and never enlarges.
  const pipeline = () => sharp(sourcePath).rotate().resize({
    width: maxDimension,
    height: maxDimension,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const [webpInfo, avifInfo] = await Promise.all([
    pipeline().webp({ quality: 80, effort: 5, smartSubsample: true }).toFile(webpPath),
    pipeline().avif({ quality: 55, effort: 7, chromaSubsampling: '4:2:0' }).toFile(avifPath),
  ]);
  const [webpStats, avifStats] = await Promise.all([fs.stat(webpPath), fs.stat(avifPath)]);
  const dimensions = `${metadata.width}×${metadata.height}`;
  const optimizedDimensions = `${webpInfo.width}×${webpInfo.height}`;

  return {
    fileName,
    original: sourceStats.size,
    webp: webpStats.size,
    avif: avifStats.size,
    dimensions,
    optimizedDimensions,
    width: webpInfo.width,
    height: webpInfo.height,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const imageFiles = entries
    .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (!imageFiles.length) {
    console.log('No JPG, JPEG, or PNG files found in assets/team/.');
    return;
  }

  const results = [];
  for (const imageFile of imageFiles) results.push(await optimizeImage(imageFile));

  console.log('\nLocal team image optimization report');
  console.log('─'.repeat(112));
  console.log('Source'.padEnd(18), 'Original'.padStart(11), 'WebP'.padStart(11), 'AVIF'.padStart(11), 'WebP saved'.padStart(13), 'AVIF saved'.padStart(13), 'Dimensions'.padStart(18));
  console.log('─'.repeat(112));
  for (const item of results) {
    console.log(
      item.fileName.padEnd(18),
      formatBytes(item.original).padStart(11),
      formatBytes(item.webp).padStart(11),
      formatBytes(item.avif).padStart(11),
      percentSaved(item.original, item.webp).padStart(13),
      percentSaved(item.original, item.avif).padStart(13),
      `${item.dimensions} → ${item.optimizedDimensions}`.padStart(18),
    );
  }
  console.log('─'.repeat(112));
  console.log(`Output: ${path.relative(projectRoot, outputDir)} (local files only; originals untouched)\n`);
}

main().catch((error) => {
  console.error('Image optimization failed:', error);
  process.exitCode = 1;
});
