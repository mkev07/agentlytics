import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { fetchConfig, updateConfig } from '../lib/api'
import AnimatedLoader from '../components/AnimatedLoader'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'

export default function CustomHome({ onConfigChanged }) {
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => setConfig({}))
  }, [])

  if (!config) {
    return <AnimatedLoader label="Loading custom settings..." />
  }

  const excludeHiddenProjectsFromAnalytics = config.excludeHiddenProjectsFromAnalytics !== false
  const hiddenProjects = config.hiddenProjects || []

  const toggleHiddenProjectExclusion = async () => {
    setSaving(true)
    const newConfig = await updateConfig({
      excludeHiddenProjectsFromAnalytics: !excludeHiddenProjectsFromAnalytics,
    })
    setConfig(newConfig)
    onConfigChanged?.()
    setSaving(false)
  }

  return (
    <div className="fade-in space-y-3">
      <PageHeader icon={Wrench} title="Custom" />

      <div className="card overflow-hidden">
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <SectionTitle>analytics behavior</SectionTitle>
          <button
            disabled={saving}
            onClick={toggleHiddenProjectExclusion}
            className="text-[11px] px-2 py-0.5 rounded transition"
            style={{
              background: excludeHiddenProjectsFromAnalytics ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
              color: excludeHiddenProjectsFromAnalytics ? '#22c55e' : '#f59e0b',
              border: `1px solid ${excludeHiddenProjectsFromAnalytics ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.2)'}`,
            }}
          >
            {excludeHiddenProjectsFromAnalytics ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="px-3 py-2 text-[11px] space-y-2" style={{ color: 'var(--c-text3)' }}>
          <p>
            When enabled, projects listed in hidden projects are excluded from dashboard totals, sessions, costs, and analytics.
          </p>
          <p>
            Hidden projects configured: <span style={{ color: 'var(--c-text2)' }}>{hiddenProjects.length}</span>
          </p>
        </div>

        <div className="px-3 py-2" style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-bg3)' }}>
          <button
            onClick={toggleHiddenProjectExclusion}
            disabled={saving}
            className="text-[11px] px-3 py-1 rounded transition font-medium"
            style={{
              background: excludeHiddenProjectsFromAnalytics ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
              color: excludeHiddenProjectsFromAnalytics ? '#f59e0b' : '#22c55e',
              border: `1px solid ${excludeHiddenProjectsFromAnalytics ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
            }}
          >
            {saving
              ? 'Saving...'
              : excludeHiddenProjectsFromAnalytics
                ? 'Include hidden projects in analytics'
                : 'Exclude hidden projects from analytics'}
          </button>
        </div>
      </div>
    </div>
  )
}
