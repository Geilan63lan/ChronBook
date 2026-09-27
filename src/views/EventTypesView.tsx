import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Check, Clock3, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type EventRow = { id: string; user_id: string; title: string; slug: string; length_minutes: number }

export function EventTypesView({ user, onEventsChange }: { user: User; onEventsChange: (events: { id?: string; name: string; duration: string; bookings: number; accent: string }[]) => void }) {
  const [events, setEvents] = useState<EventRow[]>([])
  const [title, setTitle] = useState('')
  const [length, setLength] = useState('30')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const publish = (rows: EventRow[]) => {
    setEvents(rows)
    onEventsChange(rows.map((row, index) => ({ id: row.id, name: row.title, duration: `${row.length_minutes} min`, bookings: 0, accent: ['coral', 'blue', 'mint', 'gold'][index % 4] })))
  }

  const load = async () => {
    const client = supabase
    if (!client) { setLoading(false); setMessage('Supabase is not configured.'); return }
    const { data, error } = await client.from('event_type').select('id,user_id,title,slug,length_minutes').order('title')
    if (error) setMessage(error.message)
    else publish(data ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [user.id])

  const createEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    const minutes = Number(length)
    if (!client || !Number.isInteger(minutes) || minutes < 5 || minutes > 480) return setMessage('Duration must be between 5 minutes and 8 hours.')
    setSaving(true)
    setMessage('')
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await client.from('event_type').insert({ user_id: user.id, title: title.trim(), slug, length_minutes: minutes })
    if (error) setMessage(error.message)
    else { setTitle(''); setLength('30'); await load(); setMessage('Event type created.') }
    setSaving(false)
  }

  const saveEvent = async (row: EventRow) => {
    const client = supabase
    if (!client) return
    if (!row.title.trim()) return setMessage('Event name is required.')
    if (!Number.isInteger(row.length_minutes) || row.length_minutes < 5 || row.length_minutes > 480) return setMessage('Duration must be between 5 minutes and 8 hours.')
    setSaving(true)
    const slug = row.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await client.from('event_type').update({ title: row.title.trim(), slug, length_minutes: row.length_minutes }).eq('id', row.id)
    setSaving(false)
    setMessage(error?.message ?? 'Event type saved.')
    if (!error) await load()
  }

  const deleteEvent = async (id: string) => {
    const client = supabase
    if (!client) return
    setSaving(true)
    const { error } = await client.from('event_type').delete().eq('id', id)
    setSaving(false)
    setMessage(error?.message ?? 'Event type deleted.')
    if (!error) await load()
  }

  const editRow = (id: string, patch: Partial<EventRow>) => setEvents((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row))

  return <section className="workspace-view reveal">
    <div className="workspace-view-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Event types</h1><p className="lede">Create the kinds of meetings people can book with you.</p></div><span className="connection-pill connected"><i /> Supabase synced</span></div>
    <form className="event-create panel" onSubmit={createEvent}><div className="event-create-copy"><span className="event-create-icon"><Plus size={18} /></span><div><h2>New event type</h2><p>Name it and choose how much time to reserve.</p></div></div><label className="settings-field"><span>Event name</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required placeholder="e.g. Introductory call" /></label><label className="settings-field duration-field"><span>Duration</span><span className="duration-input"><input type="number" min="5" max="480" step="5" value={length} onChange={(event) => setLength(event.target.value)} required /><span>minutes</span></span></label><button className="primary-button" type="submit" disabled={saving}><Plus size={16} /> Add event</button></form>
    <section className="event-management panel"><div className="settings-section-heading"><div><p className="section-kicker">BOOKABLE MEETINGS</p><h2>Your event types</h2><p>Updates are saved to your Supabase event type records.</p></div><span className="event-count">{events.length} {events.length === 1 ? 'type' : 'types'}</span></div>
      {loading ? <p className="workspace-message">Loading event types…</p> : events.length === 0 ? <div className="workspace-empty"><Clock3 size={22} /><strong>No event types yet</strong><span>Create your first bookable meeting above.</span></div> : <div className="managed-event-list">{events.map((row) => <div className="managed-event-row" key={row.id}><span className="event-dot blue" /><label><span>Event name</span><input value={row.title} onChange={(event) => editRow(row.id, { title: event.target.value })} /></label><label className="managed-duration"><span>Minutes</span><input type="number" min="5" max="480" step="5" value={row.length_minutes} onChange={(event) => editRow(row.id, { length_minutes: Number(event.target.value) })} /></label><button className="icon-button save-event-button" aria-label={`Save ${row.title}`} onClick={() => void saveEvent(row)} disabled={saving}><Check size={17} /></button><button className="icon-button delete-event-button" aria-label={`Delete ${row.title}`} onClick={() => void deleteEvent(row.id)} disabled={saving}><Trash2 size={17} /></button></div>)}</div>}
      {message && <p className="workspace-message" role="status">{message}</p>}
    </section>
  </section>
}