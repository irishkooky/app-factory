import { createFileRoute } from '@tanstack/react-router'
import { ComparisonLab } from '../components/ComparisonLab'
import './comparison.css'

export const Route = createFileRoute('/compare')({
  head: () => ({ meta: [{ title: 'Jev 気づくフォーム — 同じ受付、AIを交代。' }] }),
  component: ComparisonLab,
})
