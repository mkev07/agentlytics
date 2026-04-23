const featureModules = import.meta.glob('./features/*.js', { eager: true })

const modules = Object.entries(featureModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod)

export const customNavItems = modules.flatMap((mod) => mod.navItems || [])
export const customRoutes = modules.flatMap((mod) => mod.routes || [])
