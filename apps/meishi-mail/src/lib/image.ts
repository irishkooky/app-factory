const MAX_EDGE = 1600
const QUALITY = 0.85

export interface PreparedImage {
  base64: string
  mimeType: 'image/jpeg'
  previewUrl: string
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした（HEIC の場合は JPEG で撮り直してください）'))
    }
    img.src = url
  })
}

/** スマホの写真は数 MB あるので、長辺 1600px の JPEG に縮めてから送る */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像を処理できませんでした')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: 'image/jpeg', previewUrl: dataUrl }
}
