import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CalendarDays, Check, Clock3, DoorOpen, Users } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

type HotelResource = {
  id: string
  code: string
  name: string
  resource_type: 'room' | 'event_hall'
  floor: number
  capacity: number
}

type HotelBooking = {
  id: string
  resource_id: string
  start_time: string
  end_time: string
  status: string
  guest_count: number
  hotel_resource: HotelResource | HotelResource[] | null
  attendee: { name: string; email: string } | { name: string; email: string }[] | null
}

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDateTimeValue(date: Date) {
  return `${localDateValue(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function localTime(dateText: string, timeText: string) {
  const [year, month, day] = dateText.split('-').map(Number)
  const [hour, minute] = timeText.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

function relationOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export function HotelBookingsView({ user, requestedResourceCode }: { user: User; requestedResourceCode: string | null }) {
  const [resources, setResources] = useState<HotelResource[]>([])
  const [userBookings, setUserBookings] = useState<HotelBooking[]>([])
  const [selectedResource, setSelectedResource] = useState('')
  const [guestName, setGuestName] = useState(String(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? ''))
  const [guestEmail, setGuestEmail] = useState(user.email ?? '')
  const [guestCount, setGuestCount] = useState(1)
  const [checkIn, setCheckIn] = useState(() => localDateValue(new Date()))
  const [checkOut, setCheckOut] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return localDateValue(date)
  })
  const [hallStart, setHallStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(18, 0, 0, 0)
    return localDateTimeValue(date)
  })
  const [hallEnd, setHallEnd] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(22, 0, 0, 0)
    return localDateTimeValue(date)
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [cancelMessage, setCancelMessage] = useState('')
  const [editBookingId, setEditBookingId] = useState<string | null>(null)
  const [editGuestName, setEditGuestName] = useState('')
  const [editGuestEmail, setEditGuestEmail] = useState('')
  const [editGuestCount, setEditGuestCount] = useState(1)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editHallStart, setEditHallStart] = useState('')
  const [editHallEnd, setEditHallEnd] = useState('')
  const [editMessage, setEditMessage] = useState('')
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [specialRequests, setSpecialRequests] = useState('')
  const [bookingKind, setBookingKind] = useState<'room' | 'event_hall'>('room')

  const matchingResources = useMemo(() => resources.filter((resource) => resource.resource_type === bookingKind), [resources, bookingKind])
  const selected = resources.find((resource) => resource.id === selectedResource) ?? null

  const loadBookings = async () => {
    const client = supabase
    if (!client) return
      const { data, error } = await client.from('booking').select('id,resource_id,start_time,end_time,status,guest_count,hotel_resource(code,name,resource_type,floor,capacity),attendee(name,email)').eq('user_id', user.id).not('resource_id', 'is', null).order('start_time', { ascending: true })
    if (error) setMessage(error.message)
    else setUserBookings((data ?? []) as unknown as HotelBooking[])
  }

  useEffect(() => {
    const client = supabase
    if (!client) { setLoading(false); setMessage('Supabase is not configured.'); return }
    let active = true
    Promise.all([
      client.from('hotel_resource').select('id,code,name,resource_type,floor,capacity').eq('is_active', true).order('code'),
      client.from('booking').select('id,resource_id,start_time,end_time,status,guest_count,hotel_resource(code,name,resource_type,floor,capacity),attendee(name,email)').eq('user_id', user.id).not('resource_id', 'is', null).order('start_time', { ascending: true }),
    ]).then(([resourceResult, bookingResult]) => {
      if (!active) return
      if (resourceResult.error) setMessage(resourceResult.error.message)
      else {
        const rows = resourceResult.data ?? []
        setResources(rows as HotelResource[])
        const initial = rows.find((resource) => resource.code === requestedResourceCode) ?? rows.find((resource) => resource.resource_type === 'room') ?? rows[0]
        if (initial) setBookingKind(initial.resource_type)
        if (initial) setSelectedResource(initial.id)
      }
      if (bookingResult.error) setMessage(bookingResult.error.message)
      else setUserBookings((bookingResult.data ?? []) as unknown as HotelBooking[])
      setLoading(false)
    })
    return () => { active = false }
  }, [user.id, requestedResourceCode])

  const changeKind = (kind: 'room' | 'event_hall') => {
    setBookingKind(kind)
    const first = resources.find((resource) => resource.resource_type === kind)
    setSelectedResource(first?.id ?? '')
    setGuestCount(1)
    setMessage('')
  }

  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    if (!client || !selected) return setMessage('Choose an available room or event hall.')
    if (guestName.trim().length < 2) return setMessage('Enter the guest name.')
    if (!guestEmail.includes('@')) return setMessage('Enter a valid guest email.')
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > (selected.capacity ?? 1)) return setMessage(`Guest count must be between 1 and ${selected.capacity}.`)

    let start: Date
    let end: Date
    if (selected.resource_type === 'room') {
      if (checkOut <= checkIn) return setMessage('Check-out must be after check-in.')
      start = localTime(checkIn, '14:00')
      end = localTime(checkOut, '11:00')
    } else {
      start = new Date(hallStart)
      end = new Date(hallEnd)
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return setMessage('The event end must be after its start.')
    }
    if (start < new Date()) return setMessage('Choose a future check-in or event time.')

    setSubmitting(true)
    setMessage('')
    const { data, error } = await client.rpc('create_hotel_booking', {
      p_resource_id: selected.id,
      p_guest_name: guestName.trim(),
      p_guest_email: guestEmail.trim(),
      p_guest_count: guestCount,
      p_start_time: start.toISOString(),
      p_end_time: end.toISOString(),
      p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
    setSubmitting(false)
    if (error) { setMessage(error.message); return }
    setBookingReference(String(data))
    setMessage(`Reservation confirmed for ${selected.code}. Reference ${String(data).slice(0, 8).toUpperCase()}.`)
    await loadBookings()
  }

  const cancelBooking = async (bookingId: string) => {
    const client = supabase
    if (!client) return setCancelMessage('Supabase is not configured.')
    setCancelMessage('')
    const { error } = await client
      .from('booking')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', user.id)
    if (error) {
      setCancelMessage(error.message)
      return
    }
    setCancelMessage('Booking cancelled successfully.')
    await loadBookings()
  }

  const startEditBooking = (booking: HotelBooking) => {
    setEditBookingId(booking.id)
    const resource = relationOne(booking.hotel_resource)
    const attendee = relationOne(booking.attendee)
    setEditGuestName(attendee?.name ?? '')
    setEditGuestEmail(attendee?.email ?? '')
    setEditGuestCount(booking.guest_count)
    const startDate = new Date(booking.start_time)
    const endDate = new Date(booking.end_time)
    if (resource?.resource_type === 'room') {
      setEditCheckIn(localDateValue(startDate))
      setEditCheckOut(localDateValue(endDate))
      // Set times to default check-in/check-out times
      setEditHallStart(localDateTimeValue(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 14, 0, 0)))
      setEditHallEnd(localDateTimeValue(new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 11, 0, 0)))
    } else {
      setEditHallStart(localDateTimeValue(startDate))
      setEditHallEnd(localDateTimeValue(endDate))
      // Set dates to default
      setEditCheckIn(localDateValue(startDate))
      setEditCheckOut(localDateValue(endDate))
    }
    setEditMessage('')
    setBookingKind(resource?.resource_type ?? 'room')
  }

  const updateBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editBookingId) return
    const client = supabase
    if (!client) return setEditMessage('Supabase is not configured.')
    setEditMessage('')
    let start: Date
    let end: Date
    if (bookingKind === 'room') {
      if (editCheckOut <= editCheckIn) return setEditMessage('Check-out must be after check-in.')
      start = localTime(editCheckIn, '14:00')
      end = localTime(editCheckOut, '11:00')
    } else {
      start = new Date(editHallStart)
      end = new Date(editHallEnd)
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return setEditMessage('The event end must be after its start.')
    }
    if (start < new Date()) return setEditMessage('Choose a future check-in or event time.')
    const { error } = await client
      .from('booking')
      .update({
        guest_count: editGuestCount,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      .eq('id', editBookingId)
      .eq('user_id', user.id)
    if (error) {
      setEditMessage(error.message)
      return
    }
    setEditMessage('Booking updated successfully.')
    setEditBookingId(null)
    await loadBookings()
  }

  const cancelEditBooking = () => {
    setEditBookingId(null)
    setEditMessage('')
  }

  return <section className="workspace-view reveal hotel-bookings-view">
    <div className="workspace-view-heading"><div><p className="eyebrow">HOTEL RESERVATIONS</p><h1>Book a space</h1><p className="lede">Reserve a guest room or event hall at ChronBook Hotel.</p></div><span className="connection-pill connected"><i /> Live inventory</span></div>
    <div className="hotel-booking-grid">
      <form className="hotel-reservation-form panel" onSubmit={submitBooking}>
        <div className="booking-kind-tabs" role="tablist" aria-label="Reservation type"><button type="button" role="tab" aria-selected={bookingKind === 'room'} className={bookingKind === 'room' ? 'selected' : ''} onClick={() => changeKind('room')}><DoorOpen size={16} /> Guest room</button><button type="button" role="tab" aria-selected={bookingKind === 'event_hall'} className={bookingKind === 'event_hall' ? 'selected' : ''} onClick={() => changeKind('event_hall')}><CalendarDays size={16} /> Event hall</button></div>
        <label className="hotel-field"><span>Choose a {bookingKind === 'room' ? 'room' : 'hall'}</span><select value={selectedResource} onChange={(event) => { setSelectedResource(event.target.value); setGuestCount(1) }} required disabled={loading || matchingResources.length === 0}><option value="">{loading ? 'Loading spaces…' : matchingResources.length ? 'Select a space' : 'No spaces found'}</option>{matchingResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.code} · {resource.name} · up to {resource.capacity} guests</option>)}</select></label>
        {bookingKind === 'room' ? <div className="hotel-date-grid"><label className="hotel-field"><span>Check-in</span><input type="date" value={checkIn} min={localDateValue(new Date())} onChange={(event) => setCheckIn(event.target.value)} required /><small>From 2:00 PM</small></label><label className="hotel-field"><span>Check-out</span><input type="date" value={checkOut} min={checkIn} onChange={(event) => setCheckOut(event.target.value)} required /><small>By 11:00 AM</small></label></div> : <div className="hotel-date-grid"><label className="hotel-field"><span>Starts</span><input type="datetime-local" value={hallStart} min={localDateTimeValue(new Date())} onChange={(event) => setHallStart(event.target.value)} required /></label><label className="hotel-field"><span>Ends</span><input type="datetime-local" value={hallEnd} min={hallStart} onChange={(event) => setHallEnd(event.target.value)} required /></label></div>}
        <div className="hotel-form-divider"><Users size={16} /><span>Guest details</span></div>
        <label className="hotel-field"><span>Number of guests</span><input type="number" min="1" max={selected?.capacity ?? 1} value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} required /></label>
        <label className="hotel-field"><span>Guest name</span><input value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" maxLength={120} required placeholder="Full name" /></label>
        <label className="hotel-field"><span>Contact email</span><input type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} autoComplete="email" maxLength={254} required placeholder="guest@example.com" /></label>
        <label className="hotel-field"><span>Special requests</span><textarea value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} maxLength={500} placeholder="Any special requests (e.g., bed type, accessibility needs)" /></label>
        {selected && <div className="selected-resource-note"><span className="resource-code">{selected.code}</span><span>{selected.name} · Floor {selected.floor} · Capacity {selected.capacity}</span></div>}
        {bookingReference ? (
          <div className="booking-confirmation">
            <p className="hotel-booking-message" role="status">
              Reservation confirmed for {selected?.code}. Reference {String(bookingReference).slice(0, 8).toUpperCase()}.
            </p>
            <div className="qr-code">
              <QRCodeSVG
                value={JSON.stringify({
                  id: bookingReference,
                  code: selected?.code,
                  guestName: guestName,
                  guestEmail: guestEmail,
                  specialRequests: specialRequests,
                  timestamp: new Date().toISOString(),
                })}
                size={120}
                bgColor="white"
                fgColor="black"
                level="H"
              />
            </div>
          </div>
        ) : (
          <p className="hotel-booking-message" role="status">{message}</p>
        )}
        <button className="primary-button hotel-submit" type="submit" disabled={submitting || loading || !selected}>{submitting ? 'Confirming reservation…' : <>Confirm reservation <Check size={16} /></>}</button>
        <p className="hotel-form-footnote"><Clock3 size={13} /> A space is confirmed only if it is still available for the full time.</p>
      </form>

      <section className="hotel-inventory panel"><div className="panel-heading"><div><p className="section-kicker">ON PROPERTY</p><h2>Our spaces</h2><p>Choose from 10 rooms and 2 event halls.</p></div></div><div className="inventory-group"><h3><DoorOpen size={15} /> Guest rooms <span>10</span></h3><div className="inventory-grid">{resources.filter((resource) => resource.resource_type === 'room').map((resource) => <button type="button" key={resource.id} className={`inventory-tile ${selectedResource === resource.id ? 'selected' : ''}`} onClick={() => { setBookingKind('room'); setSelectedResource(resource.id); setGuestCount(1) }}><strong>{resource.code}</strong><span>Floor {resource.floor} · {resource.capacity} guests</span></button>)}</div></div><div className="inventory-group"><h3><CalendarDays size={15} /> Event halls <span>2</span></h3><div className="inventory-grid halls-grid">{resources.filter((resource) => resource.resource_type === 'event_hall').map((resource) => <button type="button" key={resource.id} className={`inventory-tile ${selectedResource === resource.id ? 'selected' : ''}`} onClick={() => { setBookingKind('event_hall'); setSelectedResource(resource.id); setGuestCount(1) }}><strong>{resource.code}</strong><span>Floor {resource.floor} · {resource.capacity} guests</span></button>)}</div></div></section>
    </div>

    <section className="hotel-reservations panel"><div className="panel-heading"><div><p className="section-kicker">YOUR STAYS & EVENTS</p><h2>My reservations</h2><p>Reservations are tied to your signed-in account.</p></div><span className="bookings-count">{userBookings.length} total</span></div>{loading ? <p className="workspace-message">Loading your reservations…</p> : userBookings.length === 0 ? <div className="workspace-empty"><CalendarDays size={22} /><strong>No reservations yet</strong><span>Your confirmed rooms and event hall bookings will show here.</span></div> : <div className="hotel-reservation-list">{userBookings.map((booking) => { const resource = relationOne(booking.hotel_resource); const attendee = relationOne(booking.attendee); return <article className="hotel-reservation-row" key={booking.id}><div className="reservation-resource-code">{resource?.code ?? 'Space'}</div><div className="reservation-description"><strong>{resource?.name ?? 'Hotel space'} · {booking.guest_count} guests</strong><span>{attendee?.name ?? 'Guest'} · {attendee?.email ?? ''}</span></div><div className="reservation-dates"><strong>{new Date(booking.start_time).toLocaleString()}</strong><span>until {new Date(booking.end_time).toLocaleString()}</span></div><span className={`status status-${booking.status}`}>{booking.status}</span>{booking.status !== 'cancelled' && (<> <button className="cancel-booking-button" onClick={() => cancelBooking(booking.id)}>Cancel</button> <button className="edit-booking-button" onClick={() => startEditBooking(booking)}>Edit</button> </>)}</article>})}</div>}</section>
    {editBookingId && (
      <section className="edit-booking-panel panel">
        <div className="panel-heading">
          <div>
            <h2>Edit Booking</h2>
            <p>Modify your reservation details below.</p>
          </div>
          <button className="text-button" onClick={cancelEditBooking}>
            Cancel
          </button>
        </div>
        <form className="edit-booking-form" onSubmit={updateBooking}>
          <div className="booking-kind-tabs" role="tablist" aria-label="Reservation type">
            <button type="button" role="tab" aria-selected={bookingKind === 'room'} className={bookingKind === 'room' ? 'selected' : ''} onClick={() => { setBookingKind('room'); setEditMessage(''); }}>
              <DoorOpen size={16} /> Guest room
            </button>
            <button type="button" role="tab" aria-selected={bookingKind === 'event_hall'} className={bookingKind === 'event_hall' ? 'selected' : ''} onClick={() => { setBookingKind('event_hall'); setEditMessage(''); }}>
              <CalendarDays size={16} /> Event hall
            </button>
          </div>
          {bookingKind === 'room' ? (
            <div className="hotel-date-grid">
              <label className="hotel-field">
                <span>Check-in</span>
                <input type="date" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} required />
                <small>From 2:00 PM</small>
              </label>
              <label className="hotel-field">
                <span>Check-out</span>
                <input type="date" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} required />
                <small>By 11:00 AM</small>
              </label>
            </div>
          ) : (
            <div className="hotel-date-grid">
              <label className="hotel-field">
                <span>Starts</span>
                <input type="datetime-local" value={editHallStart} onChange={(e) => setEditHallStart(e.target.value)} required />
              </label>
              <label className="hotel-field">
                <span>Ends</span>
                <input type="datetime-local" value={editHallEnd} onChange={(e) => setEditHallEnd(e.target.value)} required />
              </label>
            </div>
          )}
          <div className="hotel-form-divider">
            <Users size={16} /><span>Guest details</span>
          </div>
          <label className="hotel-field">
            <span>Number of guests</span>
            <input type="number" min="1" value={editGuestCount} onChange={(e) => setEditGuestCount(Number(e.target.value))} required />
          </label>
          <label className="hotel-field">
            <span>Guest name</span>
            <input value={editGuestName} onChange={(e) => setEditGuestName(e.target.value)} autoComplete="name" maxLength={120} required placeholder="Full name" />
          </label>
          <label className="hotel-field">
            <span>Contact email</span>
            <input type="email" value={editGuestEmail} onChange={(e) => setEditGuestEmail(e.target.value)} autoComplete="email" maxLength={254} required placeholder="guest@example.com" />
          </label>
          {editMessage && <p className="hotel-booking-message" role="status">{editMessage}</p>}
          <button className="primary-button hotel-submit" type="submit" disabled={submitting}>
            {submitting ? 'Updating reservation…' : <>Update booking <Check size={16} /></>}
          </button>
        </form>
      </section>
    )}
  </section>
}
