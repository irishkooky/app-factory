// Mantine の Button / Anchor を TanStack Router の Link として型安全に使うためのラッパー。
// `component={Link}` を直接指定すると Mantine のポリモーフィック型と
// TanStack Router の Link のオーバーロード解決が噛み合わず、
// `search` に渡したオブジェクトリテラルが型エラーになることがあるため、
// 公式ドキュメント（createLink ガイド）に従いラップして使う。
import { forwardRef } from 'react'
import { createLink, type LinkComponent } from '@tanstack/react-router'
import { Anchor, type AnchorProps, Button, type ButtonProps } from '@mantine/core'

interface MantineButtonLinkProps extends Omit<ButtonProps, 'component'> {}

const ButtonLinkComponent = forwardRef<HTMLAnchorElement, MantineButtonLinkProps>(
  (props, ref) => <Button component="a" ref={ref} {...props} />,
)

const CreatedButtonLink = createLink(ButtonLinkComponent)

export const ButtonLink: LinkComponent<typeof ButtonLinkComponent> = (props) => (
  <CreatedButtonLink {...props} />
)

interface MantineAnchorLinkProps extends Omit<AnchorProps, 'component' | 'href'> {}

const AnchorLinkComponent = forwardRef<HTMLAnchorElement, MantineAnchorLinkProps>(
  (props, ref) => <Anchor component="a" ref={ref} {...props} />,
)

const CreatedAnchorLink = createLink(AnchorLinkComponent)

export const AnchorLink: LinkComponent<typeof AnchorLinkComponent> = (props) => (
  <CreatedAnchorLink {...props} />
)
