import { Group, Image } from '@app-factory/ui'

const wide =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='%234c6ef5'/><text x='50%' y='50%' fill='white' font-size='20' text-anchor='middle'>写真</text></svg>"

const tall =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='320'><rect width='100%' height='100%' fill='%2312b886'/><text x='50%' y='50%' fill='white' font-size='20' text-anchor='middle'>商品画像</text></svg>"

export const RadiusSweep = () => (
  <Group align="flex-start">
    <Image src={wide} w={140} radius={0} alt="角丸なし" />
    <Image src={wide} w={140} radius="sm" alt="小さい角丸" />
    <Image src={wide} w={140} radius="md" alt="標準の角丸" />
    <Image src={wide} w={140} radius="xl" alt="大きい角丸" />
  </Group>
)

export const FitSweep = () => (
  <Group align="flex-start">
    <Image src={wide} w={140} h={140} fit="cover" radius="md" alt="cover表示" />
    <Image src={tall} w={140} h={140} fit="cover" radius="md" alt="縦長画像をcoverで表示" />
    <Image src={tall} w={140} h={140} fit="contain" radius="md" alt="縦長画像をcontainで表示" />
  </Group>
)

export const FallbackOnError = () => (
  <Image
    src={null}
    w={160}
    h={120}
    radius="md"
    fallbackSrc="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='100%' height='100%' fill='%23868e96'/><text x='50%' y='50%' fill='white' font-size='16' text-anchor='middle'>画像を読み込めません</text></svg>"
    alt="読み込み失敗時のフォールバック"
  />
)
