import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { SettingsView } from './views/SettingsView'
import { AvailabilityView } from './views/AvailabilityView'
import { EventTypesView } from './views/EventTypesView'
import { HotelBookingsView } from './views/HotelBookingsView'
import './views/workspace.css'
import {
  ArrowUpRight,
  ArrowRight,
  Bell,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  DoorOpen,
  Eye,
  EyeOff,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react'

type EditableEvent = { id?: string; name: string; duration: string; bookings: number; accent: string }
type TopPanel = 'search' | 'notifications' | null

const eventAccents = ['coral', 'blue', 'mint', 'gold']
const eventAccent = (id: string) => eventAccents[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % eventAccents.length]
const hotelResourceCodes = [
  ...Array.from({ length: 2 }, (_, floor) => Array.from({ length: 5 }, (_, room) => `${floor + 1}Rm${room + 1}`)).flat(),
  '1EH1', '2EH1',
]

function App() {
  const appRef = useRef<HTMLDivElement>(null)
  const profileWrapRef = useRef<HTMLDivElement>(null)
  const topActionsRef = useRef<HTMLDivElement>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRoleLoaded, setAdminRoleLoaded] = useState(false)
  const [adminSetupNeeded, setAdminSetupNeeded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bookingSlug, setBookingSlug] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [activeView, setActiveView] = useState('Overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [topPanel, setTopPanel] = useState<TopPanel>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')
  const [requestedResourceCode, setRequestedResourceCode] = useState<string | null>(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [editableEvents, setEditableEvents] = useState<EditableEvent[]>([])
  const [eventTypesLoading, setEventTypesLoading] = useState(true)
  const [eventTypesMessage, setEventTypesMessage] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')


  useEffect(() => {
    if (!appRef.current) return
    const context = gsap.context(() => {
      gsap.from('.reveal', { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' })
      gsap.from('.timeline-line', { scaleY: 0, transformOrigin: 'top', duration: 1.1, delay: 0.25, ease: 'power3.out' })
    }, appRef)
    return () => context.revert()
  }, [])

  useEffect(() => {
    const client = supabase
    if (!currentUser || !client) return
    client.from('app_user').select('avatar_path').eq('id', currentUser.id).maybeSingle().then(({ data }) => {
      const path = data?.avatar_path ?? null
      setAvatarPath(path)
      setAvatarUrl(path ? client.storage.from('avatars').getPublicUrl(path).data.publicUrl : null)
    })
  }, [currentUser])

  useEffect(() => {
    const client = supabase
    if (!currentUser || !client) {
      setIsAdmin(false)
      setAdminRoleLoaded(Boolean(currentUser))
      return
    }
    let isCurrent = true
    setAdminRoleLoaded(false)
    Promise.resolve(client.rpc('is_admin')).then(({ data, error }) => {
      if (!isCurrent) return
      setIsAdmin(!error && data === true)
      setAdminSetupNeeded(Boolean(error) || data !== true)
      setAdminRoleLoaded(true)
    }).catch(() => {
      if (!isCurrent) return
      setIsAdmin(false)
      setAdminSetupNeeded(true)
      setAdminRoleLoaded(true)
    })
    return () => { isCurrent = false }
  }, [currentUser])

  useEffect(() => {
    if (activeView === 'Admin' && adminRoleLoaded && !isAdmin) setActiveView('Overview')
  }, [activeView, adminRoleLoaded, isAdmin])

  useEffect(() => {
    const client = supabase
    if (!currentUser || !client) return
    setDisplayName(currentUser.user_metadata?.display_name ?? currentUser.email?.split('@')[0] ?? '')
    setBookingSlug(currentUser.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? '')
    client.from('account_settings').select('display_name,booking_slug').eq('user_id', currentUser.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name)
      if (data?.booking_slug) setBookingSlug(data.booking_slug)
    })
  }, [currentUser])

  useEffect(() => {
    const client = supabase
    if (!currentUser || !client) return
    let active = true
    setEventTypesLoading(true)
    client.from('event_type').select('id,title,length_minutes').order('title').then(({ data, error }) => {
      if (!active) return
      if (error) setEventTypesMessage(error.message)
      else {
        setEditableEvents((data ?? []).map((row) => ({ id: row.id, name: row.title, duration: `${row.length_minutes} min`, bookings: 0, accent: eventAccent(row.id) })))
        setEventTypesMessage('')
      }
      setEventTypesLoading(false)
    })
    return () => { active = false }
  }, [currentUser])

  useEffect(() => {
    if (!profileMenuOpen && !topPanel) return
    const closeOverlays = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (profileMenuOpen && !profileWrapRef.current?.contains(target)) setProfileMenuOpen(false)
      if (topPanel && !topActionsRef.current?.contains(target)) setTopPanel(null)
    }
    document.addEventListener('pointerdown', closeOverlays)
    return () => document.removeEventListener('pointerdown', closeOverlays)
  }, [profileMenuOpen, topPanel])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
      setAuthLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setEmailVerified(false)
      return
    }
    // Check if email is confirmed
    const isConfirmed = !!currentUser.email_confirmed_at
    setEmailVerified(isConfirmed)
    if (!isConfirmed) {
      // Optionally, we can sign out the user or restrict access
      // For now, we just set the state and handle it in the UI
    }
  }, [currentUser])

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || !supabase || !currentUser) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarMessage('Choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage('Profile pictures must be 2 MB or smaller.')
      return
    }

    // Note: For production, consider adding server-side validation via Supabase Edge Functions to prevent malicious file uploads.

    setAvatarBusy(true)
    setAvatarMessage('')
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const newPath = `${currentUser.id}/avatar-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(newPath, file, { contentType: file.type, cacheControl: '3600' })
    if (uploadError) {
      setAvatarBusy(false)
      setAvatarMessage(uploadError.message)
      return
    }

    const { error: profileError } = await supabase.rpc('set_own_avatar_path', { p_path: newPath })
    if (profileError) {
      await supabase.storage.from('avatars').remove([newPath])
      setAvatarBusy(false)
      setAvatarMessage(profileError.message)
      return
    }

    if (avatarPath) await supabase.storage.from('avatars').remove([avatarPath])
    setAvatarPath(newPath)
    setAvatarUrl(supabase.storage.from('avatars').getPublicUrl(newPath).data.publicUrl)
    setAvatarBusy(false)
    setAvatarMessage('Profile picture saved.')
  }

  const saveAdminEvents = async () => {
    if (!supabase) return setAdminMessage('Add Supabase browser settings to enable saving.')
    if (!currentUser || !isAdmin) return setAdminMessage('Supabase did not authorize this account as an admin.')
    if (editableEvents.some((event) => !event.name.trim() || Number.parseInt(event.duration, 10) < 5 || Number.parseInt(event.duration, 10) > 480 || Number.isNaN(Number.parseInt(event.duration, 10)))) return setAdminMessage('Each event needs a name and a duration between 5 and 480 minutes.')

    const updatedEvents: EditableEvent[] = []
    for (const event of editableEvents) {
      const row = {
        title: event.name.trim(),
        slug: event.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        length_minutes: Number.parseInt(event.duration, 10),
      }
      const result = event.id
        ? await supabase.from('event_type').update(row).eq('id', event.id).select('id').single()
        : await supabase.from('event_type').insert({ ...row, user_id: currentUser.id }).select('id').single()
      if (result.error) return setAdminMessage(result.error.message)
      updatedEvents.push({ ...event, id: result.data?.id ?? event.id })
    }
    setEditableEvents(updatedEvents)
    setAdminMessage('Event types saved to Supabase.')
  }

  const resendVerificationEmail = async () => {
    if (!supabase || !currentUser?.email) return
    try {
      await supabase.auth.resend({ type: 'signup', email: currentUser.email })
      setVerifyMessage('Verification email resent!')
    } catch (error) {
      setVerifyMessage('Failed to resend verification email.')
    }
  }

  if (authLoading) return <div className="auth-loading" aria-label="Loading ChronBook"><span className="brand-mark"><CalendarDays size={17} /></span></div>
  if (!currentUser) return <AuthLanding configured={isSupabaseConfigured} />
  if (!emailVerified) {
    return (
      <div className="email-verification-required">
        <div className="email-verification-content">
          <h2>Email verification required</h2>
          <p>Please check your email and click the verification link to continue.</p>
          {verifyMessage && <p className="email-verification-message">{verifyMessage}</p>}
          <button className="email-verification-resend" onClick={resendVerificationEmail}>
            Resend verification email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" ref={appRef}>
      <aside className={`sidebar reveal ${sidebarCollapsed ? 'collapsed' : ''} ${mobileNavOpen ? 'mobile-open' : ''}`} onClick={() => { if (!window.matchMedia('(max-width: 680px)').matches) setSidebarCollapsed((collapsed) => !collapsed) }} onKeyDown={(event) => { if (!window.matchMedia('(max-width: 680px)').matches && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSidebarCollapsed((collapsed) => !collapsed) } }} tabIndex={0} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <div className="brand"><span className="brand-mark"><CalendarDays size={17} /></span><span className="brand-name">chronbook</span></div>
        <div className="profile-wrap" ref={profileWrapRef}>
          <button className="workspace-switcher" onClick={(event) => { event.stopPropagation(); if (sidebarCollapsed) { setSidebarCollapsed(false); setProfileMenuOpen(true) } else setProfileMenuOpen((open) => !open) }} aria-expanded={profileMenuOpen} aria-haspopup="menu"><UserAvatar url={avatarUrl} fallback={currentUser.email?.slice(0, 1) ?? 'C'} /><span className="workspace-name">{displayName || currentUser.email}</span><ChevronDown size={15} /></button>
          {profileMenuOpen && <div className="profile-menu" role="menu" onClick={(event) => event.stopPropagation()}><div className="profile-menu-heading"><strong>{displayName || 'ChronBook account'}</strong><span>{currentUser.email}</span></div><label className="profile-menu-action" role="menuitem"><Camera size={15} /><span>{avatarBusy ? 'Uploading picture…' : 'Change profile picture'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={avatarBusy} /></label>{avatarMessage && <p className="avatar-message" role="status">{avatarMessage}</p>}<button role="menuitem" onClick={() => { setActiveView('Settings'); setProfileMenuOpen(false) }}><Settings2 size={15} /> Account settings</button>{isAdmin && <button role="menuitem" onClick={() => { setActiveView('Admin'); setProfileMenuOpen(false) }}><ShieldCheck size={15} /> Admin workspace</button>}<button role="menuitem" onClick={async () => { await supabase?.auth.signOut(); setProfileMenuOpen(false) }}><LogOut size={15} /> Sign out</button></div>}
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={activeView === 'Overview'} onClick={() => { setActiveView('Overview'); setMobileNavOpen(false) }} />
          <NavItem icon={<CalendarDays size={17} />} label="Bookings" active={activeView === 'Bookings'} onClick={() => { setActiveView('Bookings'); setMobileNavOpen(false) }} badge="24" />
          <NavItem icon={<Clock3 size={17} />} label="Availability" active={activeView === 'Availability'} onClick={() => { setActiveView('Availability'); setMobileNavOpen(false) }} />
          <NavItem icon={<Users size={17} />} label="Event types" active={activeView === 'Event types'} onClick={() => { setActiveView('Event types'); setMobileNavOpen(false) }} />
          {isAdmin && <NavItem icon={<ShieldCheck size={17} />} label="Admin" active={activeView === 'Admin'} onClick={() => { setActiveView('Admin'); setMobileNavOpen(false) }} />}
        </nav>
        <div className="sidebar-bottom">
          <NavItem icon={<Settings2 size={17} />} label="Settings" active={activeView === 'Settings'} onClick={() => { setActiveView('Settings'); setMobileNavOpen(false) }} />
          <NavItem icon={<LogOut size={17} />} label="Sign out" active={false} onClick={() => { void supabase?.auth.signOut(); setProfileMenuOpen(false); setMobileNavOpen(false) }} />
          <div className="security-note"><LockKeyhole size={15} /><span>Secure workspace<br /><small>Protected by default</small></span></div>
          <div className="sidebar-footer"><span>ChronBook beta</span><span>v0.1</span></div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open menu" aria-expanded={mobileNavOpen} onClick={() => { setSidebarCollapsed(false); setMobileNavOpen(true) }}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeView}</strong></div>
          <div className="top-actions" ref={topActionsRef}>
            <button className="icon-button" aria-label="Search" aria-expanded={topPanel === 'search'} onClick={() => setTopPanel((panel) => panel === 'search' ? null : 'search')}><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Notifications" aria-expanded={topPanel === 'notifications'} onClick={() => setTopPanel((panel) => panel === 'notifications' ? null : 'notifications')}><Bell size={18} /><span /></button>
            {topPanel === 'search' && <div className="top-popover search-popover"><label><Search size={16} /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search hotel spaces and event types" /></label>{searchTerm.trim() ? <div className="top-popover-results">{hotelResourceCodes.filter((code) => code.toLowerCase().includes(searchTerm.toLowerCase())).map((code) => <button key={code} onClick={() => { setRequestedResourceCode(code); setActiveView('Bookings'); setTopPanel(null) }}><span className="event-dot gold" /><span><strong>{code}</strong><small>{code.includes('EH') ? 'Event hall' : 'Guest room'}</small></span></button>)}{editableEvents.filter((event) => event.name.toLowerCase().includes(searchTerm.toLowerCase())).map((event) => <button key={event.id ?? event.name} onClick={() => { setActiveView('Event types'); setTopPanel(null) }}><span className={`event-dot ${event.accent}`} /><span><strong>{event.name}</strong><small>Event type · {event.duration}</small></span></button>)}{!hotelResourceCodes.some((code) => code.toLowerCase().includes(searchTerm.toLowerCase())) && !editableEvents.some((event) => event.name.toLowerCase().includes(searchTerm.toLowerCase())) && <p className="top-popover-empty">No matching rooms, halls, or event types.</p>}</div> : <p className="top-popover-empty">Search rooms, event halls, and event types.</p>}</div>}
            {topPanel === 'notifications' && <div className="top-popover notification-popover"><p className="section-kicker">HOTEL RESERVATIONS</p><strong>Reservations are confirmed when the space is available.</strong><p className="top-popover-empty">Open Bookings to reserve a room or event hall.</p><button className="popover-footer-action" onClick={() => { setActiveView('Bookings'); setTopPanel(null) }}>Browse spaces <ArrowUpRight size={14} /></button></div>}
          </div>
        </header>

        {activeView === 'Overview' ? <>
          <section className="page-heading reveal"><div><p className="eyebrow">HOTEL BOOKING WORKSPACE</p><h1>Make room for<br /><em>good stays.</em></h1><p className="lede">Reserve guest rooms and event halls across both floors.</p></div><div className="heading-actions"><span className="live-pulse"><i /> Live inventory</span><button className="primary-button" onClick={() => setActiveView('Bookings')}><Plus size={17} /> New reservation</button></div></section>

          <section className="stats-grid reveal" aria-label="Hotel inventory">
            <StatCard label="Guest rooms" value="10" trend="2 floors" detail="5 rooms per floor" icon={<DoorOpen size={18} />} />
            <StatCard label="Event halls" value="2" trend="1 per floor" detail="Up to 100 guests" icon={<CalendarDays size={18} />} />
            <StatCard label="Bookable spaces" value="12" trend="Rooms + halls" detail="Overlap protected" icon={<Check size={18} />} />
          </section>

          <section className="hotel-home-inventory panel reveal"><div className="panel-heading"><div><p className="section-kicker">ON PROPERTY</p><h2>Choose your space</h2><p>Select a room or hall to start a reservation.</p></div><button className="text-button" onClick={() => { setRequestedResourceCode(null); setActiveView('Bookings') }}>All spaces <ArrowUpRight size={15} /></button></div><div className="hotel-home-resource-grid">{hotelResourceCodes.map((code) => <button className="hotel-home-resource" key={code} onClick={() => { setRequestedResourceCode(code); setActiveView('Bookings') }}><span className="event-dot gold" /><strong>{code}</strong><small>{code.includes('EH') ? 'Event hall' : 'Guest room'}</small><ArrowRight size={14} /></button>)}</div></section>
        </> : activeView === 'Bookings' ? <HotelBookingsView user={currentUser} requestedResourceCode={requestedResourceCode} /> : activeView === 'Settings' ? <SettingsView user={currentUser} initialDisplayName={displayName} initialBookingSlug={bookingSlug} onDisplayNameChange={setDisplayName} onBookingSlugChange={setBookingSlug} adminSetupNeeded={adminSetupNeeded} /> : activeView === 'Availability' ? <AvailabilityView user={currentUser} /> : activeView === 'Event types' ? <EventTypesView user={currentUser} events={editableEvents} onEventsChange={setEditableEvents} loading={eventTypesLoading} message={eventTypesMessage} setMessage={setEventTypesMessage} /> : activeView === 'Admin' && isAdmin ? <AdminView events={editableEvents} setEvents={setEditableEvents} message={adminMessage} onSave={saveAdminEvents} signedInEmail={currentUser.email ?? ''} isAdmin={isAdmin} loading={eventTypesLoading} /> : <section className="placeholder-view"><div className="placeholder-icon"><Sparkles size={24} /></div><p className="eyebrow">ChronBook workspace</p><h1>{activeView}</h1><p className="lede">This workspace is ready for the next hotel workflow.</p><button className="primary-button" onClick={() => { setRequestedResourceCode(null); setActiveView('Bookings') }}><Plus size={17} /> New reservation</button></section>}
      </main>

    </div>
  )
}

function UserAvatar({ url, fallback }: { url: string | null; fallback: string }) {
  return <span className="avatar small-avatar">{url ? <img src={url} alt="" /> : fallback.toUpperCase()}</span>
}

function AuthLanding({ configured }: { configured: boolean }) {
  const landingRef = useRef<HTMLElement>(null)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!landingRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const context = gsap.context(() => {
      gsap.from('.auth-reveal', { y: 18, opacity: 0, duration: .7, stagger: .09, ease: 'power3.out' })
      gsap.from('.login-panel', { x: 22, opacity: 0, duration: .8, delay: .12, ease: 'power3.out' })
    }, landingRef)
    return () => context.revert()
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not configured. Add the VITE_SUPABASE settings and restart the dev server.')
    setBusy(true)
    setMessage('')
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    setMessage(result.error?.message ?? (mode === 'sign-up' ? 'Account created. Check your email to verify it, then sign in.' : 'Signed in.'))
  }

  const resetPassword = async () => {
    if (!supabase || !email) return setMessage('Enter your email first, then request a password reset.')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setBusy(false)
    setMessage(error?.message ?? 'Password reset instructions have been sent to your email.')
  }

  return <main className="auth-screen" ref={landingRef}>
    <section className="auth-story">
      <div className="auth-brand auth-reveal"><span className="brand-mark"><CalendarDays size={18} /></span><span>chronbook</span><span className="brand-beta">SCHEDULING WORKSPACE</span></div>
      <div className="auth-story-copy auth-reveal"><p className="auth-kicker"><span /> A PLACE FOR EVERY OCCASION</p><h1>Your stay,<br /><em>well reserved.</em></h1><p>Book a comfortable room or bring everyone together in one of our event halls.</p></div>
      <div className="auth-agenda auth-reveal"><div className="agenda-top"><span>ON PROPERTY</span><span>2 FLOORS</span></div><div className="agenda-item"><time>ROOM</time><i className="agenda-dot lime" /><div><strong>1Rm1 — 2Rm5</strong><span>Ten guest rooms · two floors</span></div><ArrowRight size={15} /></div><div className="agenda-item"><time>HALL</time><i className="agenda-dot violet" /><div><strong>1EH1 · 2EH1</strong><span>Event spaces · one per floor</span></div><ArrowRight size={15} /></div><div className="agenda-foot"><span className="agenda-pulse" /> Reservations checked against live availability.</div></div>
      <footer className="auth-footer auth-reveal"><span>CHRONBOOK</span><span>YOUR TIME, IN GOOD ORDER</span></footer>
    </section>
    <section className="auth-form-side">
      <div className="login-panel">
        <p className="auth-kicker">ACCOUNT ACCESS</p><h2>{mode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</h2><p className="auth-subtitle">{mode === 'sign-in' ? 'Sign in to continue to your workspace.' : 'Start organizing your schedule with ChronBook.'}</p>
        <div className="auth-tabs" role="tablist" aria-label="Account access mode"><button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'selected' : ''} onClick={() => { setMode('sign-in'); setMessage('') }}>Sign in</button><button type="button" role="tab" aria-selected={mode === 'sign-up'} className={mode === 'sign-up' ? 'selected' : ''} onClick={() => { setMode('sign-up'); setMessage('') }}>Create account</button></div>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <div className="password-label"><label htmlFor="auth-password">Password</label>{mode === 'sign-in' && <button type="button" className="quiet-link" onClick={resetPassword} disabled={busy}>Forgot password?</button>}</div>
          <div className="password-input"><input id="auth-password" type={passwordVisible ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" className="password-toggle" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <button className="auth-submit" type="submit" disabled={busy || !configured}>{busy ? 'Working…' : mode === 'sign-in' ? 'Sign in to ChronBook' : 'Create account'}<ArrowRight size={17} /></button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        {!configured && <p className="auth-message warning" role="status">Supabase credentials are missing. Add them to `.env.local` to enable login.</p>}
        <div className="auth-trust"><LockKeyhole size={14} /><span>Your account is protected by Supabase authentication.</span></div>
      </div>
      <div className="auth-side-footer"><span>© 2026 ChronBook</span><span>SECURE SIGN-IN</span></div>
    </section>
  </main>
}

function NavItem({ icon, label, active, badge, onClick }: { icon: ReactNode; label: string; active: boolean; badge?: string; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onClick() }} title={label}>{icon}<span>{label}</span>{badge && <span className="nav-badge">{badge}</span>}</button>
}

function AdminView({ events, setEvents, message, onSave, signedInEmail, isAdmin, loading }: { events: EditableEvent[]; setEvents: (events: EditableEvent[]) => void; message: string; onSave: () => void; signedInEmail: string; isAdmin: boolean; loading: boolean }) {
  return <section className="admin-view reveal">
    <div className="admin-heading"><div><p className="eyebrow">Control room</p><h1>Admin settings</h1><p className="lede">Update the event types people can book.</p></div><span className="connection-pill connected"><i /> Supabase admin</span></div>
    {isAdmin && <><p className="signed-in-note">Signed in as {signedInEmail} · Admin</p><div className="admin-panel panel"><div className="panel-heading"><div><h2>Event types</h2><p>Changes are scoped by database RLS.</p></div><button className="primary-button" onClick={onSave} disabled={loading}><Check size={16} /> Save changes</button></div>{loading ? <p className="workspace-message">Loading event types…</p> : <div className="admin-table">{events.map((event, index) => <div className="admin-row" key={event.id ?? `${event.name}-${index}`}><span className={`event-dot ${event.accent}`} /><input value={event.name} aria-label={`Event type ${index + 1} name`} onChange={(inputEvent) => setEvents(events.map((item, itemIndex) => itemIndex === index ? { ...item, name: inputEvent.target.value } : item))} /><input type="number" min="5" max="480" step="5" value={Number.parseInt(event.duration, 10)} aria-label={`Event type ${index + 1} duration in minutes`} onChange={(inputEvent) => setEvents(events.map((item, itemIndex) => itemIndex === index ? { ...item, duration: `${inputEvent.target.value} min` } : item))} /><span className="admin-bookings">{event.bookings} bookings</span></div>)}</div>}{message && <p className="admin-message" role="status">{message}</p>}</div></>}
  </section>
}

function StatCard({ label, value, trend, detail, icon }: { label: string; value: string; trend: string; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-detail"><span className="trend">{trend}</span><span>{detail}</span></div></div>
}

export default App
