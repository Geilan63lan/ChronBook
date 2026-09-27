import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Check, Clock3, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type EventRow = { id?: string; name: string; duration: string; bookings: number; accent: string }

export function EventTypesView({ user, events, onEventsChange, loading, message, setMessage }: { user: User; events: EventRow[]; onEventsChange: (events: EventRow[]) => void; loading: boolean; message: string; setMessage: (message: string) => void }) {
  const [title, setTitle] = useState('')
  const [length, setLength] = useState('30')
  const [saving, setSaving] = useState(false)

  const createEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    const minutes = Number(length)
    if (!client || !Number.isInteger(minutes) || minutes < 5 || minutes > 480) return setMessage('Duration must be between 5 minutes and 8 hours.')
    setSaving(true)
    setMessage('')
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data, error } = await client.from('event_type').insert({ user_id: user.id, title: title.trim(), slug, length_minutes: minutes }).select('id').single()
    if (error) setMessage(error.message)
    else if (data) {
      onEventsChange([...events, { id: data.id, name: title.trim(), duration: `${minutes} min`, bookings: 0, accent: 'blue' }].sort((left, right) => left.name.localeCompare(right.name)))
      setTitle('')
      setLength('30')
      setMessage('Event type created.')
    }
    setSaving(false)
  }

  const saveEvent = async (row: EventRow) => {
    const client = supabase
    if (!client) return
    if (!row.id) return setMessage('This event type is not saved yet.')
    const minutes = Number.parseInt(row.duration, 10)
    if (!row.name.trim()) return setMessage('Event name is required.')
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) return setMessage('Duration must be between 5 minutes and 8 hours.')
    setSaving(true)
    const slug = row.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await client.from('event_type').update({ title: row.name.trim(), slug, length_minutes: minutes }).eq('id', row.id)
    setSaving(false)
    setMessage(error?.message ?? 'Event type saved.')
  }

  const deleteEvent = async (id: string) => {
    const client = supabase
    if (!client) return
    setSaving(true)
    const { error } = await client.from('event_type').delete().eq('id', id)
    setSaving(false)
    setMessage(error?.message ?? 'Event type deleted.')
    if (!error) onEventsChange(events.filter((event) => event.id !== id))
  }

  const editRow = (id: string | undefined, patch: Partial<EventRow>) => onEventsChange(events.map((row) => row.id === id ? { ...row, ...patch } : row))

  return <section className="workspace-view reveal">
    <div className="workspace-view-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Event types</h1><p className="lede">Create the kinds of meetings people can book with you.</p></div><span className="connection-pill connected"><i /> Supabase synced</span></div>
    <form className="event-create panel" onSubmit={createEvent}><div className="event-create-copy"><span className="event-create-icon"><Plus size={18} /></span><div><h2>New event type</h2><p>Name it and choose how much time to reserve.</p></div></div><label className="settings-field"><span>Event name</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required placeholder="e.g. Introductory call" /></label><label className="settings-field duration-field"><span>Duration</span><span className="duration-input"><input type="number" min="5" max="480" step="5" value={length} onChange={(event) => setLength(event.target.value)} required /><span>minutes</span></span></label><button className="primary-button" type="submit" disabled={saving}><Plus size={16} /> Add event</button></form>
    <section className="event-management panel"><div className="settings-section-heading"><div><p className="section-kicker">BOOKABLE MEETINGS</p><h2>Your event types</h2><p>Updates are saved to your Supabase event type records.</p></div><span className="event-count">{events.length} {events.length === 1 ? 'type' : 'types'}</span></div>
      {loading ? <p className="workspace-message">Loading event types…</p> : events.length === 0 ? <div className="workspace-empty"><Clock3 size={22} /><strong>No event types yet</strong><span>Create your first bookable meeting above.</span></div> : <div className="managed-event-list">{events.map((row) => <div className="managed-event-row" key={row.id ?? row.name}><span className={`event-dot ${row.accent}`} /><label><span>Event name</span><input value={row.name} onChange={(event) => editRow(row.id, { name: event.target.value })} /></label><label className="managed-duration"><span>Minutes</span><input type="number" min="5" max="480" step="5" value={Number.parseInt(row.duration, 10)} onChange={(event) => editRow(row.id, { duration: `${event.target.value} min` })} /></label><button className="icon-button save-event-button" aria-label={`Save ${row.name}`} onClick={() => void saveEvent(row)} disabled={saving || !row.id}><Check size={17} /></button><button className="icon-button delete-event-button" aria-label={`Delete ${row.name}`} onClick={() => row.id && void deleteEvent(row.id)} disabled={saving || !row.id}><Trash2 size={17} /></button></div>)}</div>}
      {message && <p className="workspace-message" role="status">{message}</p>}
    </section>
  </section>
}