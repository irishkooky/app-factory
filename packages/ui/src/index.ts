// app-factory shared UI: curated Mantine v9 components + shared theme.
// Apps may import from '@app-factory/ui' instead of '@mantine/core' directly.

export { AppProvider } from './provider'
export type { AppProviderProps } from './provider'
export { theme } from './theme'

// Layout
export {
  AppShell,
  Container,
  Stack,
  Group,
  Flex,
  Grid,
  SimpleGrid,
  Box,
  Center,
  Paper,
  Card,
  Divider,
  ScrollArea,
} from '@mantine/core'

// Typography
export { Title, Text, Anchor, List, Code } from '@mantine/core'

// Buttons
export { Button, ActionIcon } from '@mantine/core'

// Inputs
export {
  TextInput,
  Textarea,
  NumberInput,
  PasswordInput,
  Select,
  Checkbox,
  Radio,
  Switch,
  Slider,
  SegmentedControl,
} from '@mantine/core'

// Feedback
export {
  Alert,
  Badge,
  Progress,
  RingProgress,
  Loader,
  Skeleton,
  Notification,
} from '@mantine/core'

// Data display & navigation
export {
  Table,
  Avatar,
  Image,
  ThemeIcon,
  Tabs,
  Accordion,
  Pagination,
  Breadcrumbs,
  Stepper,
  Timeline,
} from '@mantine/core'

// Overlays
export { Modal, Drawer, Menu, Tooltip, Popover } from '@mantine/core'

// Hooks commonly needed alongside the components
export { useDisclosure } from '@mantine/hooks'
