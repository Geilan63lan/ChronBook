import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Settings2,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

type BookingStatus = 'Confirmed' | 'Pending' | 'Completed'

type Booking = {
  time: string
  period: string
  title: string
  attendee: string
  email: string
  status: BookingStatus
  color: string
}

type EditableEvent = { name: string; duration: string; bookings: number; accent: string }

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@example.com'

const bookings: Booking[] = [
  { time: '09:30', period: 'AM', title: 'Product strategy call', attendee: 'Maya Chen', email: 'maya.chen@northstar.co', status: 'Confirmed', color: 'blue' },
  { time: '11:00', period: 'AM', title: 'Onboarding session', attendee: 'Luca Moretti', email: 'luca@studioframe.it', status: 'Pending', color: 'mint' },
  { time: '01:30', period: 'PM', title: 'Quarterly review', attendee: 'Ava Johnson', email: 'ava.j@commonthread.io', status: 'Confirmed', color: 'coral' },
  { time: '03:00', period: 'PM', title: 'Design critique', attendee: 'Theo Williams', email: 'theo@northstar.co', status: 'Completed', color: 'gold' },
]

const initialEventTypes: EditableEvent[] = [
  { name: '30 min discovery call', duration: '30 min', bookings: 18, accent: 'coral' },
  { name: 'Product strategy call', duration: '60 min', bookings: 9, accent: 'blue' },
  { name: 'Onboarding session', duration: '45 min', bookings: 12, accent: 'mint' },
]

function App() {
  const appRef = useRef<HTMLDivElement>(null)
  const [activeView, setActiveView] = useState('Overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'All' | BookingStatus>('All')
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [editableEvents, setEditableEvents] = useState(initialEventTypes)

  const visibleBookings = statusFilter === 'All' ? bookings : bookings.filter((booking) => booking.status === statusFilter)

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.from('.reveal', { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' })
      gsap.from('.timeline-line', { scaleY: 0, transformOrigin: 'top', duration: 1.1, delay: 0.25, ease: 'power3.out' })
    }, appRef)
    return () => context.revert()
  }, [])

  const copyLink = async () => {
    await navigator.clipboard?.writeText('chronbook.me/alex')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="app-shell" ref={appRef}>
      <aside className={`sidebar reveal ${sidebarCollapsed ? 'collapsed' : ''}`} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSidebarCollapsed((collapsed) => !collapsed) } }} tabIndex={0} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <div className="brand"><span className="brand-mark">C</span><span className="brand-name">chronbook</span></div>
        <div className="profile-wrap">
          <button className="workspace-switcher" onClick={(event) => { event.stopPropagation(); setProfileMenuOpen((open) => !open) }} aria-expanded={profileMenuOpen} aria-haspopup="menu"><span className="avatar small-avatar">AC</span><span className="workspace-name">Alex Carter</span><ChevronDown size={15} /></button>
          {profileMenuOpen && <div className="profile-menu" role="menu" onClick={(event) => event.stopPropagation()}><div className="profile-menu-heading"><strong>Alex Carter</strong><span>{adminEmail}</span></div><button role="menuitem" onClick={() => { setActiveView('Settings'); setProfileMenuOpen(false) }}><Settings2 size={15} /> Account settings</button><button role="menuitem" onClick={() => { setActiveView('Admin'); setProfileMenuOpen(false) }}><ShieldCheck size={15} /> Admin workspace</button><button role="menuitem" onClick={async () => { await supabase?.auth.signOut(); setProfileMenuOpen(false) }}><LogOut size={15} /> Sign out</button></div>}
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={activeView === 'Overview'} onClick={() => setActiveView('Overview')} />
          <NavItem icon={<CalendarDays size={17} />} label="Bookings" active={activeView === 'Bookings'} onClick={() => setActiveView('Bookings')} badge="24" />
          <NavItem icon={<Clock3 size={17} />} label="Availability" active={activeView === 'Availability'} onClick={() => setActiveView('Availability')} />
          <NavItem icon={<Users size={17} />} label="Event types" active={activeView === 'Event types'} onClick={() => setActiveView('Event types')} />
          <NavItem icon={<ShieldCheck size={17} />} label="Admin" active={activeView === 'Admin'} onClick={() => setActiveView('Admin')} />
        </nav>
        <div className="sidebar-bottom">
          <NavItem icon={<Settings2 size={17} />} label="Settings" active={activeView === 'Settings'} onClick={() => setActiveView('Settings')} />
          <div className="security-note"><LockKeyhole size={15} /><span>Secure workspace<br /><small>Protected by default</small></span></div>
          <div className="sidebar-footer"><span>ChronBook beta</span><span>v0.1</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeView}</strong></div>
          <div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><span /></button></div>
        </header>

        {activeView === 'Overview' ? <>
          <section className="page-heading reveal"><div><p className="eyebrow">Monday, September 21, 2026</p><h1>Make room for<br /><em>good work.</em></h1><p className="lede">Your day, arranged with intention.</p></div><div className="heading-actions"><span className="live-pulse"><i /> Live schedule</span><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={17} /> New booking</button></div></section>

          <section className="stats-grid reveal" aria-label="Booking summary">
            <StatCard label="Bookings this month" value="39" trend="+18.4%" detail="vs. last month" icon={<CalendarDays size={18} />} />
            <StatCard label="Hours booked" value="28.5" trend="+12.1%" detail="vs. last month" icon={<Clock3 size={18} />} />
            <StatCard label="Conversion rate" value="68%" trend="+4.6%" detail="from booking page" icon={<ArrowUpRight size={18} />} />
          </section>

          <section className="content-grid reveal">
            <div className="schedule-panel panel"><div className="panel-heading"><div><p className="section-kicker">Your day at a glance</p><h2>Today’s schedule</h2><p>September 21 · Pacific Time</p></div><button className="text-button" onClick={() => setActiveView('Bookings')}>Open calendar <ArrowUpRight size={15} /></button></div><div className="filter-row">{(['All', 'Confirmed', 'Pending', 'Completed'] as const).map((filter) => <button key={filter} className={`filter-chip ${statusFilter === filter ? 'selected' : ''}`} onClick={() => setStatusFilter(filter)}>{filter}</button>)}</div><div className="timeline-wrap"><span className="timeline-line" /> <div className="booking-list">{visibleBookings.map((booking) => <BookingRow key={`${booking.time}-${booking.title}`} booking={booking} />)}</div></div></div>
            <aside className="right-column"><div className="share-panel panel"><div className="share-icon"><Link2 size={19} /></div><p className="eyebrow">Your booking page</p><h2>Let people book time with you.</h2><p className="muted">Share one link and let ChronBook handle the time zones, reminders, and details.</p><div className="share-link"><span>chronbook.me/alex</span><button onClick={copyLink} aria-label="Copy booking page link">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><button className="outline-button" onClick={copyLink}>{copied ? 'Copied to clipboard' : 'Copy booking link'} <ArrowUpRight size={15} /></button></div><div className="event-panel panel"><div className="panel-heading"><div><h2>Event types</h2><p>What people can book</p></div><button className="icon-button" aria-label="Add event type"><Plus size={17} /></button></div>{editableEvents.map((event) => <div className="event-row" key={event.name}><span className={`event-dot ${event.accent}`} /><div><strong>{event.name}</strong><span>{event.duration} · {event.bookings} bookings</span></div><ChevronDown size={15} className="event-chevron" /></div>)}</div></aside>
          </section>
        </> : activeView === 'Admin' ? <AdminView events={editableEvents} setEvents={setEditableEvents} message={adminMessage} onSave={async () => { if (!supabase) { setAdminMessage('Add Supabase environment variables to enable saving.'); return } const { data: { user } } = await supabase.auth.getUser(); if (!user) { setAdminMessage('Sign in is required before admin changes can be saved.'); return } const { error } = await supabase.from('event_type').upsert(editableEvents.map((event) => ({ user_id: user.id, title: event.name, slug: event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), length_minutes: Number.parseInt(event.duration, 10) })), { onConflict: 'user_id,slug' }); setAdminMessage(error ? error.message : 'Event types saved to Supabase.'); }} /> : <section className="placeholder-view"><div className="placeholder-icon"><Sparkles size={24} /></div><p className="eyebrow">ChronBook workspace</p><h1>{activeView}</h1><p className="lede">This workspace is ready for the next booking workflow.</p><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={17} /> Create booking</button></section>}
      </main>

      {showModal && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowModal(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Quick action</p><h2 id="modal-title">Create a booking</h2></div><button className="icon-button" onClick={() => setShowModal(false)} aria-label="Close dialog"><X size={18} /></button></div><label>Event type<select defaultValue="Product strategy call"><option>Product strategy call</option><option>30 min discovery call</option><option>Onboarding session</option></select></label><label>Attendee email<input type="email" placeholder="name@company.com" /></label><div className="modal-actions"><button className="outline-button" onClick={() => setShowModal(false)}>Cancel</button><button className="primary-button" onClick={() => setShowModal(false)}><Check size={16} /> Save booking</button></div><p className="modal-footnote"><LockKeyhole size={13} /> Server-side validation and authorization will be required before persistence.</p></section></div>}
    </div>
  )
}

function NavItem({ icon, label, active, badge, onClick }: { icon: ReactNode; label: string; active: boolean; badge?: string; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onClick() }} title={label}>{icon}<span>{label}</span>{badge && <span className="nav-badge">{badge}</span>}</button>
}

function AdminView({ events, setEvents, message, onSave }: { events: EditableEvent[]; setEvents: (events: EditableEvent[]) => void; message: string; onSave: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client) return
    client.auth.getUser().then(async ({ data }) => { setSignedInEmail(data.user?.email ?? null); if (data.user) { const { data: profile } = await client.from('app_user').select('role').eq('id', data.user.id).maybeSingle(); setIsAdmin(profile?.role === 'admin') } })
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => { setSignedInEmail(session?.user.email ?? null); if (!session) setIsAdmin(false) })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (createAccount: boolean) => {
    if (!supabase) return setAccountMessage('Supabase is not configured.')
    const result = createAccount ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    setAccountMessage(result.error?.message ?? (createAccount ? 'Account created. Check your email to verify it.' : 'Signed in.'))
  }

  return <section className="admin-view reveal"><div className="admin-heading"><div><p className="eyebrow">Control room</p><h1>Admin settings</h1><p className="lede">Update the event types people can book.</p></div><span className={`connection-pill ${isSupabaseConfigured ? 'connected' : ''}`}><i /> {isSupabaseConfigured ? 'Supabase configured' : 'Local preview mode'}</span></div>{!signedInEmail && <div className="account-panel panel"><div><p className="section-kicker">Account access</p><h2>Sign in to manage your workspace</h2><p>Admin changes are scoped to your Supabase account.</p></div><div className="account-fields"><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><div className="account-actions"><button className="primary-button" onClick={() => signIn(false)}>Sign in</button><button className="outline-button" onClick={() => signIn(true)}>Create account</button></div></div>{accountMessage && <p className="admin-message">{accountMessage}</p>}</div>}{signedInEmail && !isAdmin && <div className="account-panel panel"><div><p className="section-kicker">Signed in</p><h2>Admin access required</h2><p>{signedInEmail} is signed in, but this account does not have the admin role.</p></div></div>}{signedInEmail && isAdmin && <><p className="signed-in-note">Signed in as {signedInEmail} · Admin</p><div className="admin-panel panel"><div className="panel-heading"><div><h2>Event types</h2><p>Changes are scoped to the admin account.</p></div><button className="primary-button" onClick={onSave}><Check size={16} /> Save changes</button></div><div className="admin-table">{events.map((event, index) => <div className="admin-row" key={`${event.name}-${index}`}><span className={`event-dot ${event.accent}`} /><input value={event.name} aria-label={`Event type ${index + 1} name`} onChange={(inputEvent) => setEvents(events.map((item, itemIndex) => itemIndex === index ? { ...item, name: inputEvent.target.value } : item))} /><input value={event.duration} aria-label={`Event type ${index + 1} duration`} onChange={(inputEvent) => setEvents(events.map((item, itemIndex) => itemIndex === index ? { ...item, duration: inputEvent.target.value } : item))} /><span className="admin-bookings">{event.bookings} bookings</span></div>)}</div>{message && <p className="admin-message">{message}</p>}</div></>}</section>
}

function StatCard({ label, value, trend, detail, icon }: { label: string; value: string; trend: string; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-detail"><span className="trend">{trend}</span><span>{detail}</span></div></div>
}

function BookingRow({ booking }: { booking: Booking }) {
  return <div className="booking-row"><div className="booking-time"><strong>{booking.time}</strong><span>{booking.period}</span></div><span className={`booking-marker ${booking.color}`} /><div className="booking-details"><strong>{booking.title}</strong><span>{booking.attendee} <i>·</i> {booking.email}</span></div><span className={`status status-${booking.status.toLowerCase()}`}>{booking.status}</span></div>
}

export default App
