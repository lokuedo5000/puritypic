const sharp = require('sharp');
const fs = require('fs');

async function convertAndOptimizeImage(inputBuffer, options = {}) {
    // Opciones de conversión y optimización (puedes personalizarlas según tus necesidades)
    const conversionOptions = {
        format: 'webp',
        quality: 80,
        ...options
    };

    try {
        const optimizedBuffer = await sharp(inputBuffer)
            .toFormat(conversionOptions.format, conversionOptions)
            .toBuffer();

        return optimizedBuffer;
    } catch (error) {
        throw error;
    }
}

async function bufferToImage(buffer, outputPath, options) {

    const format = options.format || 'png';
    const quality = options.quality || 80;
    const compressionLevel = options.compressionLevel || 4;

    await saveImage(outputPath, buffer);
}

async function saveImage(dest, imageBuffer) {
    await fs.promises.writeFile(dest, imageBuffer);
}

module.exports = {
    convertAndOptimizeImage,
    bufferToImage,
};