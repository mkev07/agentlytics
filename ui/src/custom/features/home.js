import { Wrench } from 'lucide-react'
import CustomHome from '../CustomHome'

export const navItems = [
  { to: '/custom', icon: Wrench, label: 'Custom' },
]

export const routes = [
  { path: '/custom', Component: CustomHome },
]
