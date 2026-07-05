import { createFileRoute } from '@tanstack/react-router'
import { Container, Stack } from '@mantine/core'
import { Hero } from '../components/Hero'
import { LayersSection } from '../components/LayersSection'
import { SimulatorSection } from '../components/simulator/SimulatorSection'
import { PartsSection } from '../components/PartsSection'
import { ExamplesSection } from '../components/ExamplesSection'
import { SourcesFooter } from '../components/SourcesFooter'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <Container size="md" py="xl">
      <Stack gap={64}>
        <Hero />
        <LayersSection />
        <SimulatorSection />
        <PartsSection />
        <ExamplesSection />
        <SourcesFooter />
      </Stack>
    </Container>
  )
}
