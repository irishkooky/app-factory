import { Box, type BoxProps } from '@mantine/core'
import type { Photo } from '../site.config'

type Props = BoxProps & {
  photo: Photo
  /** 例: '4 / 3' */
  ratio: string
  radius?: number
  eager?: boolean
}

/** 比率を固定して cover で切り抜く写真 */
export function Img({ photo, ratio, radius = 4, eager, style, ...rest }: Props) {
  return (
    <Box
      {...rest}
      alt={photo.alt}
      component="img"
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      src={photo.src}
      style={{
        aspectRatio: ratio,
        borderRadius: radius,
        objectFit: 'cover',
        objectPosition: photo.position ?? 'center',
        width: '100%',
        ...(typeof style === 'object' ? style : {}),
      }}
    />
  )
}
