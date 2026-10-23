// Imagem sintetica, sem foto, pessoa, metadados ou dados de producao.
async function uploadFixture(){const fs=require('node:fs/promises'),magick=await import('@imagemagick/magick-wasm');await magick.initializeImageMagick(await fs.readFile(require.resolve('@imagemagick/magick-wasm/magick.wasm')));return magick.ImageMagick.read(magick.MagickColors.Red,8,6,image=>image.write(magick.MagickFormat.Png,bytes=>new Uint8Array(bytes)));}
module.exports={uploadFixture};
