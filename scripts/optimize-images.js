const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const bmp = require("bmp-js");

const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "optimized-images");
const supportedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".bmp",
  ".tif",
  ".tiff",
]);
const ignoredDirectories = new Set([".git", "node_modules"]);
const responsiveWidths = [320, 640, 960, 1280, 1600];
const webpOptions = {
  quality: 85,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
};

async function findImages(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (path.resolve(entryPath) === outputRoot) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        images.push(...(await findImages(entryPath)));
      }
      continue;
    }

    if (
      entry.isFile() &&
      supportedExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      images.push(entryPath);
    }
  }

  return images;
}

function getOutputPaths(imagePaths) {
  const stemCounts = new Map();

  for (const imagePath of imagePaths) {
    const relativePath = path.relative(projectRoot, imagePath);
    const stem = path.basename(imagePath, path.extname(imagePath)).toLowerCase();
    const key = `${path.dirname(relativePath)}:${stem}`;
    stemCounts.set(key, (stemCounts.get(key) || 0) + 1);
  }

  return imagePaths.map((imagePath) => {
    const relativePath = path.relative(projectRoot, imagePath);
    const extension = path.extname(imagePath);
    const stem = path.basename(imagePath, extension);
    const key = `${path.dirname(relativePath)}:${stem.toLowerCase()}`;
    const suffix =
      stemCounts.get(key) > 1 ? `-${extension.slice(1).toLowerCase()}` : "";
    const outputDirectory = path.join(
      outputRoot,
      path.dirname(relativePath),
    );

    return {
      imagePath,
      outputDirectory,
      outputPath: path.join(outputDirectory, `${stem}${suffix}.webp`),
    };
  });
}

async function convertImage({ imagePath, outputDirectory, outputPath }) {
  const image = await loadImage(imagePath);
  const { metadata } = image;

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${imagePath}`);
  }

  const isRotated =
    metadata.orientation >= 5 && metadata.orientation <= 8;
  const displayWidth = isRotated ? metadata.height : metadata.width;
  const variantPaths = [];

  await fs.mkdir(outputDirectory, { recursive: true });
  await image.create()
    .rotate()
    .webp(webpOptions)
    .toFile(outputPath);

  for (const width of responsiveWidths) {
    if (width >= displayWidth) {
      continue;
    }

    const variantPath = outputPath.replace(/\.webp$/i, `-${width}w.webp`);
    await image.create()
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp(webpOptions)
      .toFile(variantPath);
    variantPaths.push(`${width}w`);
  }

  return { displayWidth, variantPaths };
}

async function loadImage(imagePath) {
  if (path.extname(imagePath).toLowerCase() !== ".bmp") {
    const metadata = await sharp(imagePath).metadata();
    return {
      metadata,
      create: () => sharp(imagePath),
    };
  }

  const decoded = bmp.decode(await fs.readFile(imagePath));
  const rgba = Buffer.allocUnsafe(decoded.width * decoded.height * 4);

  for (let sourceOffset = 0; sourceOffset < decoded.data.length; sourceOffset += 4) {
    const targetOffset = sourceOffset;
    rgba[targetOffset] = decoded.data[sourceOffset + 3];
    rgba[targetOffset + 1] = decoded.data[sourceOffset + 2];
    rgba[targetOffset + 2] = decoded.data[sourceOffset + 1];
    rgba[targetOffset + 3] =
      decoded.bitPP === 32 ? decoded.data[sourceOffset] : 255;
  }

  return {
    metadata: {
      width: decoded.width,
      height: decoded.height,
      orientation: 1,
    },
    create: () =>
      sharp(rgba, {
        raw: { width: decoded.width, height: decoded.height, channels: 4 },
      }),
  };
}

async function main() {
  const imagePaths = await findImages(projectRoot);
  const outputPaths = getOutputPaths(imagePaths);
  let variantCount = 0;

  for (const output of outputPaths) {
    const { displayWidth, variantPaths } = await convertImage(output);
    variantCount += variantPaths.length;
    console.log(
      `${path.relative(projectRoot, output.imagePath)} -> ${path.relative(
        projectRoot,
        output.outputPath,
      )} (${displayWidth}px; ${variantPaths.join(", ") || "no smaller variants"})`,
    );
  }

  console.log(
    `Optimized ${imagePaths.length} image(s) and generated ${variantCount} responsive variant(s) in ${path.relative(
      projectRoot,
      outputRoot,
    )}.`,
  );
}

main().catch((error) => {
  console.error("Image optimization failed:", error);
  process.exitCode = 1;
});
