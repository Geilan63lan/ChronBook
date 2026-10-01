import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Check, ExternalLink, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

const timeZones = ['UTC', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Manila', 'Asia/Tokyo', 'Australia/Sydney']

export function SettingsView({ user, initialDisplayName, initialBookingSlug, onDisplayNameChange, onBookingSlugChange, adminSetupNeeded }: { user: User; initialDisplayName: string; initialBookingSlug: string; onDisplayNameChange: (name: string) => void; onBookingSlugChange: (slug: string) => void; adminSetupNeeded: boolean }) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bookingSlug, setBookingSlug] = useState(initialBookingSlug)
  const [timeZone, setTimeZone] = useState(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timeZones.includes(browserTimeZone) ? browserTimeZone : 'UTC'
  })
  const [bookingPageEnabled, setBookingPageEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) return
    client.from('account_settings').select('display_name,booking_slug,default_time_zone,booking_page_enabled').eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (data) {
        setDisplayName(data.display_name)
        setBookingSlug(data.booking_slug)
        onBookingSlugChange(data.booking_slug)
        setTimeZone(data.default_time_zone)
        setBookingPageEnabled(data.booking_page_enabled)
      } else if (error) setMessage(error.message)
      setLoading(false)
    })
  }, [user.id])

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not configured.')
    const normalizedSlug = bookingSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    if (!displayName.trim() || !normalizedSlug) return setMessage('Display name and booking link are required.')
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('account_settings').upsert({
      user_id: user.id,
      display_name: displayName.trim(),
      booking_slug: normalizedSlug,
      default_time_zone: timeZone,
      booking_page_enabled: bookingPageEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
    setMessage(error?.message ?? 'Settings saved.')
    if (!error) {
      setBookingSlug(normalizedSlug)
      onDisplayNameChange(displayName.trim())
      onBookingSlugChange(normalizedSlug)
    }
  }

  return <section className="workspace-view reveal">
    <div className="workspace-view-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Settings</h1><p className="lede">Shape how people find and book time with you.</p></div><span className="connection-pill connected"><i /> Account preferences</span></div>
    {adminSetupNeeded && <div className="admin-setup-notice"><strong>Admin role not active yet</strong><span>Supabase did not confirm admin access. Verify this account has the designated Auth UID and email <code>Lanzuela63@gmail.com</code>, run <code>docs/supabase-upgrade.sql</code> in the Supabase SQL Editor, then sign out and back in.</span></div>}
    <form className="settings-layout" onSubmit={save}>
      <section className="settings-section panel"><div className="settings-section-heading"><div><p className="section-kicker">01 / PROFILE</p><h2>Public identity</h2><p>This is shown on your ChronBook booking page.</p></div><span className="settings-avatar">{displayName.slice(0, 1).toUpperCase() || 'C'}</span></div>
        <label className="settings-field"><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required placeholder="Your name" /></label>
        <label className="settings-field"><span>Booking link</span><div className="slug-input"><span>chronbook.me/</span><input value={bookingSlug} onChange={(event) => setBookingSlug(event.target.value)} maxLength={50} pattern="[A-Za-z0-9-]+" required aria-label="Booking link name" /></div></label>
      </section>
      <section className="settings-section panel"><div className="settings-section-heading"><div><p className="section-kicker">02 / TIME</p><h2>Time zone</h2><p>Used when showing your availability and booking times.</p></div></div>
        <label className="settings-field"><span>Default time zone</span><select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>{timeZones.map((zone) => <option value={zone} key={zone}>{zone.replaceAll('_', ' ')}</option>)}</select></label>
      </section>
      <section className="settings-section panel"><div className="settings-section-heading"><div><p className="section-kicker">03 / DISCOVERY</p><h2>Booking page</h2><p>Control whether your public link accepts new bookings.</p></div><ExternalLink size={18} className="settings-trailing-icon" /></div>
        <label className="settings-toggle"><span><strong>Publish booking page</strong><small>{bookingPageEnabled ? `Your page is available at chronbook.me/${bookingSlug || '…'}` : 'Your booking link is paused.'}</small></span><input type="checkbox" checked={bookingPageEnabled} onChange={(event) => setBookingPageEnabled(event.target.checked)} /><i /></label>
      </section>
      <div className="settings-actions"><p className="workspace-message" role="status">{loading ? 'Loading settings…' : message}</p><button className="primary-button" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : <><Save size={16} /> Save settings</>}</button></div>
    </form>
  </section>
}