import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {ImageMagick,initializeImageMagick,MagickFormat,ResourceLimits} from 'npm:@imagemagick/magick-wasm@0.0.44';
import {configureDecoderLimits} from '../upload-media/media-validation.mjs';
import {runtimeConfig,configuredOrigins} from '../upload-media/runtime-config.mjs';
import {createAvatarHandler,sanitizeAvatar} from './handler.mjs';

// WASM e limites estaticos preparados na inicializacao, sem processar imagens.
await initializeImageMagick(await Deno.readFile(new URL(import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44/magick.wasm'))));
configureDecoderLimits(ResourceLimits);
Deno.serve(createAvatarHandler({
 allowedOrigins:configuredOrigins(Deno.env.get('APP_ORIGINS'),Deno.env.get('APP_ORIGIN')),
 getConfig:()=>runtimeConfig(Deno.env),createClient,
 sanitize:(bytes:Uint8Array,mime:string)=>sanitizeAvatar(bytes,mime,ImageMagick,MagickFormat),
}));
