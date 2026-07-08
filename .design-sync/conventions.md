# app-factory UI (Mantine v9) — build conventions

This design system is `@app-factory/ui`: a curated set of Mantine v9 components plus the shared app-factory theme (primary color `indigo`, default radius `md`). Components are used exactly like Mantine — there is no custom CSS class vocabulary.

## 1. Always wrap the app in `AppProvider`

`AppProvider` is the root wrapper (MantineProvider preconfigured with the app-factory theme). Without it, components render with browser-default typography and no theme colors — Mantine injects its `--mantine-*` CSS variables at runtime through this provider.

```jsx
import { AppProvider, Container, Title } from window.AppFactoryUI // conceptual — components come from the AppFactoryUI global

<AppProvider>
  <Container size="sm" py="xl">
    <Title order={1}>ダッシュボード</Title>
  </Container>
</AppProvider>
```

## 2. Styling idiom: props, not CSS classes

Never invent CSS class names — this system has none. Style through props:

- **Style props** (every component): `m` `mt` `mb` `ml` `mr` `mx` `my` `p` `pt` `pb` `px` `py` (spacing: `xs`–`xl` or px), `c` (text color), `bg` (background), `w` `h` `maw` `mah` (sizes), `ta` (text-align), `fw` (font-weight), `fz` (font-size). Example: `<Text c="dimmed" fz="sm" mt="md">`.
- **Component props**: `variant` (`filled` | `light` | `outline` | `subtle` for Button/ActionIcon/Badge…), `color` (theme palette name: `indigo` is the brand primary; also `red`, `teal`, `gray`, …), `size` (`xs`–`xl`), `radius` (`xs`–`xl`; default `md`).
- **Color tokens**: palette names with shade indices, e.g. `c="indigo.7"`, `bg="indigo.0"`, `c="dimmed"` for secondary text. CSS variables `var(--mantine-color-indigo-6)`, `var(--mantine-spacing-md)` etc. are available inside `style={}` when needed.
- **Layout**: compose with `Stack` (vertical, `gap`), `Group` (horizontal, `justify`/`align`), `Grid`/`SimpleGrid` (columns), `Container` (page width, `size="sm"` is the house default for simple apps), `Card withBorder radius="md" padding="lg"` for content blocks.

Typography: font stack is `'Inter', 'Hiragino Sans', sans-serif` (system fallback — no webfont ships). Content in these apps is typically Japanese.

## 3. Where the truth lives

- `styles.css` (imports the full compiled Mantine stylesheet) — the complete style surface.
- `components/<group>/<Name>/<Name>.d.ts` — each component's props contract. NOTE: universal style props (`m`, `p`, `c`, `bg`, …) are filtered out of these interfaces but work on every component.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage notes; the preview cards show idiomatic composition.

## 4. Idiomatic page snippet

```jsx
<AppProvider>
  <Container size="sm" py="xl">
    <Stack gap="lg">
      <Title order={1}>今週の天気</Title>
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between">
          <Text fw={700}>東京</Text>
          <Badge color="teal">晴れ</Badge>
        </Group>
        <Text c="dimmed" size="sm" mt="xs">最高 28°C / 最低 21°C</Text>
        <Button variant="light" fullWidth mt="md">詳細を見る</Button>
      </Card>
    </Stack>
  </Container>
</AppProvider>
```

Overlays (`Modal`, `Drawer`, `Menu`, `Tooltip`, `Popover`) are controlled via the `opened` prop (pair with `useDisclosure`). Icon libraries are NOT part of this system — use text, emoji, or `ThemeIcon` with a unicode glyph.
