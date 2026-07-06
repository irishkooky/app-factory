# @app-factory/ui

Shared, curated Mantine v9 UI kit and app-factory theme (indigo primary, `md`
radius, Inter font stack) for all apps in this monorepo. Import components
from here instead of pulling them directly from `@mantine/core` so every app
stays visually consistent.

## Usage

```tsx
import '@mantine/core/styles.css'
import { AppProvider, Button, Stack, Title } from '@app-factory/ui'

function App() {
  return (
    <AppProvider>
      <Stack>
        <Title order={1}>Hello</Title>
        <Button>Click me</Button>
      </Stack>
    </AppProvider>
  )
}
```

## Build

```
pnpm -F @app-factory/ui build
```

builds the package into `dist/`.
