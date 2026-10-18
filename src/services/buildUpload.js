// Subida resumable (TUS) al bucket privado `builds`. Archivo aparte para que
// tus-js-client solo se cargue con el panel del dev (ruta diferida).
import * as tus from 'tus-js-client'
import { supabase } from './supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Sube un archivo al bucket privado `builds` con TUS (resumable), como
 * recomienda Supabase para archivos de más de 6 MB.
 * @param {{path: string, file: File, onProgress?: (ratio: number) => void}} opts
 * @returns {{promise: Promise<void>, abort: () => void}}
 */
export function uploadBuildFile({ path, file, onProgress }) {
  let upload
  const promise = (async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Tu sesión expiró. Inicia sesión otra vez.')

    await new Promise((resolve, reject) => {
      upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'builds',
          objectName: path,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // Supabase exige trozos de 6 MB
        onError: reject,
        onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
        onSuccess: () => resolve(),
      })
      // Reanuda una subida previa del mismo archivo si quedó a medias
      upload.findPreviousUploads().then(previous => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0])
        upload.start()
      })
    })
  })()

  return { promise, abort: () => upload?.abort() }
}
