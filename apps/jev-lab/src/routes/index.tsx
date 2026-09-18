import { createFileRoute } from '@tanstack/react-router'
import { SemanticLab } from '../components/SemanticLab'
import './semantic.css'

export const Route = createFileRoute('/')({ component: SemanticLab })
