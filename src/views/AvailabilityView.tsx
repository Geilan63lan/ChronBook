import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Check, Clock3, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

type DayRule = { weekday: number; enabled: boolean; start: string; end: string }
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const defaultRules: DayRule[] = weekdays.map((_, weekday) => ({ weekday, enabled: weekday < 5, start: '09:00', end: '17:00' }))
const supportedTimeZones = ['UTC', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Manila', 'Asia/Tokyo', 'Australia/Sydney']

function toDatabaseWeekday(day: number) { return (day + 1) % 7 }
function fromDatabaseWeekday(day: number) { return (day + 6) % 7 }

export function AvailabilityView({ user }: { user: User }) {
  const [rules, setRules] = useState(defaultRules)
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return supportedTimeZones.includes(browserTimeZone) ? browserTimeZone : 'UTC'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) return
    const load = async () => {
      const [scheduleResult, settingsResult] = await Promise.all([
        client.from('schedule').select('id,time_zone').eq('user_id', user.id).order('name').limit(1),
        client.from('account_settings').select('default_time_zone').eq('user_id', user.id).maybeSingle(),
      ])
      if (scheduleResult.error) { setMessage(scheduleResult.error.message); setLoading(false); return }
      const schedule = scheduleResult.data?.[0]
      if (settingsResult.data?.default_time_zone) setTimeZone(settingsResult.data.default_time_zone)
      if (!schedule) { setLoading(false); return }
      setScheduleId(schedule.id)
      if (schedule.time_zone && !settingsResult.data?.default_time_zone) setTimeZone(schedule.time_zone)
      const { data, error } = await client.from('availability_rule').select('weekday,start_time,end_time').eq('schedule_id', schedule.id)
      if (error) setMessage(error.message)
      if (data?.length) {
        setRules(defaultRules.map((defaultRule) => {
          const saved = data.find((row) => fromDatabaseWeekday(row.weekday) === defaultRule.weekday)
          return saved ? { ...defaultRule, enabled: true, start: saved.start_time.slice(0, 5), end: saved.end_time.slice(0, 5) } : { ...defaultRule, enabled: false }
        }))
      }
      setLoading(false)
    }
    void load()
  }, [user.id])

  const updateRule = (weekday: number, patch: Partial<DayRule>) => setRules((current) => current.map((rule) => rule.weekday === weekday ? { ...rule, ...patch } : rule))

  const save = async () => {
    const client = supabase
    if (!client) return setMessage('Supabase is not configured.')
    if (rules.some((rule) => rule.enabled && rule.start >= rule.end)) return setMessage('Each enabled day must end after it starts.')
    setSaving(true)
    setMessage('')
    let activeScheduleId = scheduleId
    if (!activeScheduleId) {
      const { data, error } = await client.from('schedule').insert({ user_id: user.id, name: 'Default availability', time_zone: timeZone }).select('id').single()
      if (error || !data) { setSaving(false); setMessage(error?.message ?? 'Could not create a schedule.'); return }
      activeScheduleId = data.id
      setScheduleId(data.id)
    } else {
      const { error } = await client.from('schedule').update({ time_zone: timeZone }).eq('id', activeScheduleId)
      if (error) { setSaving(false); setMessage(error.message); return }
    }
    for (const rule of rules) {
      const weekday = toDatabaseWeekday(rule.weekday)
      const result = rule.enabled
        ? await client.from('availability_rule').upsert({ schedule_id: activeScheduleId, weekday, start_time: rule.start, end_time: rule.end }, { onConflict: 'schedule_id,weekday' })
        : await client.from('availability_rule').delete().eq('schedule_id', activeScheduleId).eq('weekday', weekday)
      if (result.error) { setSaving(false); setMessage(result.error.message); return }
    }
    setSaving(false)
    setMessage('Availability saved.')
  }

  return <section className="workspace-view reveal">
    <div className="workspace-view-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Availability</h1><p className="lede">Set the hours people can request time with you.</p></div><span className="connection-pill connected"><i /> Weekly schedule</span></div>
    <section className="availability-section panel"><div className="settings-section-heading"><div><p className="section-kicker">WEEKLY HOURS</p><h2>When are you available?</h2><p>Choose the days and hours you want to offer.</p></div><Clock3 size={18} className="settings-trailing-icon" /></div>
      <label className="settings-field availability-zone"><span>Schedule time zone</span><select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>{supportedTimeZones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
      <div className="availability-list">{rules.map((rule) => <div className={`availability-row ${rule.enabled ? '' : 'disabled'}`} key={rule.weekday}><label className="day-toggle"><input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.weekday, { enabled: event.target.checked })} /><i /><strong>{weekdays[rule.weekday]}</strong></label>{rule.enabled ? <div className="time-range"><input type="time" value={rule.start} onChange={(event) => updateRule(rule.weekday, { start: event.target.value })} aria-label={`${weekdays[rule.weekday]} start time`} /><span>to</span><input type="time" value={rule.end} onChange={(event) => updateRule(rule.weekday, { end: event.target.value })} aria-label={`${weekdays[rule.weekday]} end time`} /></div> : <span className="unavailable-label">Unavailable</span>}</div>)}</div>
      <div className="settings-actions"><p className="workspace-message" role="status">{loading ? 'Loading availability…' : message}</p><button className="primary-button" onClick={() => void save()} disabled={saving || loading}>{saving ? 'Saving…' : <><Check size={16} /> Save hours</>}</button></div>
    </section>
  </section>
}