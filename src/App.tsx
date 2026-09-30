import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, FileCheck2, FileClock, FileText, Fingerprint,
  Globe2, LayoutDashboard, LockKeyhole, LogOut, Menu, MoreHorizontal, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, UserRound, UsersRound, X,
} from 'lucide-react'

type Page = 'overview' | 'citizens' | 'departments' | 'services' | 'applications' | 'workflows' | 'integrations' | 'api-gateway' | 'connectors' | 'data-standards' | 'master-data' | 'consents' | 'events' | 'notifications' | 'sla' | 'exceptions' | 'audit' | 'analytics' | 'system-health' | 'developer-portal' | 'settings' | 'citizen'
type Step = { department: string; status: 'approved' | 'pending' | 'review'; initials: string; color: string }
type Application = {
  id: string; name: string; service: string; submitted: string; due: string
  status: 'In review' | 'Action needed' | 'Approved'; step: string; approvals: Step[]
}
type EventItem = { time: string; actor: string; action: string; detail: string; type: string }
type CitizenForm = { name: string; email: string; business: string; address: string; identity: boolean; tax: boolean }

const seedApps: Application[] = [
  { id: 'CIV-2026-0842', name: 'Maya Patel', service: 'Small business permit', submitted: 'Today, 09:42', due: 'Oct 02', status: 'In review', step: 'Municipal licensing', approvals: [
    { department: 'Identity verification', status: 'approved', initials: 'ID', color: 'mint' }, { department: 'Tax compliance', status: 'approved', initials: 'TX', color: 'blue' }, { department: 'Municipal licensing', status: 'pending', initials: 'ML', color: 'amber' },
  ] },
  { id: 'CIV-2026-0841', name: 'Jordan Lee', service: 'Food vendor license', submitted: 'Today, 08:16', due: 'Oct 01', status: 'Action needed', step: 'Document review', approvals: [
    { department: 'Identity verification', status: 'approved', initials: 'ID', color: 'mint' }, { department: 'Health department', status: 'review', initials: 'HD', color: 'rose' }, { department: 'Municipal licensing', status: 'pending', initials: 'ML', color: 'amber' },
  ] },
  { id: 'CIV-2026-0839', name: 'Amara Okafor', service: 'Home improvement grant', submitted: 'Yesterday', due: 'Oct 03', status: 'In review', step: 'Eligibility check', approvals: [
    { department: 'Identity verification', status: 'approved', initials: 'ID', color: 'mint' }, { department: 'Housing services', status: 'pending', initials: 'HS', color: 'blue' }, { department: 'Finance', status: 'pending', initials: 'FN', color: 'amber' },
  ] },
  { id: 'CIV-2026-0836', name: 'Theo Williams', service: 'Small business permit', submitted: 'Sep 28', due: 'Sep 30', status: 'Approved', step: 'Complete', approvals: [
    { department: 'Identity verification', status: 'approved', initials: 'ID', color: 'mint' }, { department: 'Tax compliance', status: 'approved', initials: 'TX', color: 'blue' }, { department: 'Municipal licensing', status: 'approved', initials: 'ML', color: 'amber' },
  ] },
]

const seedEvents: EventItem[] = [
  { time: '09:42:18', actor: 'MahaSetu Gateway', action: 'Application received', detail: 'CIV-2026-0842 · Small business permit', type: 'blue' },
  { time: '09:42:19', actor: 'Identity service', action: 'Identity verified', detail: 'Consent: identity verification · one-time check', type: 'green' },
  { time: '09:42:20', actor: 'Revenue service', action: 'Tax status checked', detail: 'Consent: tax compliance · read-only', type: 'green' },
  { time: '09:18:06', actor: 'Jordan Lee', action: 'Document requested', detail: 'CIV-2026-0841 · Proof of food handling', type: 'amber' },
]
const connectorData = [
  { name: 'Identity registry', type: 'REST API · v2.4', initials: 'ID', color: 'mint', latency: '82 ms', uptime: '99.98%' },
  { name: 'Revenue & tax', type: 'Legacy adapter · SOAP', initials: 'TX', color: 'blue', latency: '146 ms', uptime: '99.91%' },
  { name: 'Municipal licensing', type: 'REST API · v1.8', initials: 'ML', color: 'amber', latency: '104 ms', uptime: '99.96%' },
  { name: 'Housing services', type: 'Message queue · AMQP', initials: 'HS', color: 'rose', latency: 'Queue · 3', uptime: '99.87%' },
]

const adminNavGroups: { label: string; items: { page: Page; name: string; icon: ReactNode }[] }[] = [
  { label: 'MANAGEMENT', items: [
    { page: 'citizens', name: 'Citizens', icon: <UserRound /> }, { page: 'departments', name: 'Departments', icon: <UsersRound /> },
    { page: 'services', name: 'Services', icon: <FileText /> }, { page: 'applications', name: 'Applications', icon: <FileClock /> },
  ] },
  { label: 'ORCHESTRATION', items: [
    { page: 'workflows', name: 'Workflows', icon: <RefreshCw /> }, { page: 'integrations', name: 'Integrations', icon: <Globe2 /> },
    { page: 'api-gateway', name: 'API gateway', icon: <Activity /> }, { page: 'connectors', name: 'Connectors', icon: <Settings2 /> },
  ] },
  { label: 'GOVERNANCE', items: [
    { page: 'data-standards', name: 'Data standards', icon: <FileCheck2 /> }, { page: 'master-data', name: 'Master data', icon: <UsersRound /> },
    { page: 'consents', name: 'Consents', icon: <LockKeyhole /> }, { page: 'events', name: 'Events', icon: <Activity /> },
    { page: 'notifications', name: 'Notifications', icon: <Bell /> }, { page: 'sla', name: 'SLA monitoring', icon: <Clock3 /> },
    { page: 'exceptions', name: 'Exceptions', icon: <CircleHelp /> }, { page: 'audit', name: 'Audit logs', icon: <ShieldCheck /> },
    { page: 'analytics', name: 'Analytics', icon: <ArrowUpRight /> },
  ] },
  { label: 'PLATFORM', items: [
    { page: 'system-health', name: 'System health', icon: <Activity /> }, { page: 'developer-portal', name: 'Developer portal', icon: <Search /> },
    { page: 'settings', name: 'Settings', icon: <Settings2 /> },
  ] },
]

const adminPaths: Record<Exclude<Page, 'citizen'>, string> = {
  overview: 'dashboard', citizens: 'citizens', departments: 'departments', services: 'services', applications: 'applications',
  workflows: 'workflows', integrations: 'integrations', 'api-gateway': 'api-gateway', connectors: 'connectors',
  'data-standards': 'data-standards', 'master-data': 'master-data', consents: 'consents', events: 'events',
  notifications: 'notifications', sla: 'sla', exceptions: 'exceptions', audit: 'audit', analytics: 'analytics',
  'system-health': 'system-health', 'developer-portal': 'developer-portal', settings: 'settings',
}

function pageFromAdminPath(path: string): Page {
  const parts = path.split('/').filter(Boolean)
  const slug = parts[parts.length - 1] ?? 'dashboard'
  return Object.entries(adminPaths).find(([, route]) => route === slug)?.[0] as Page ?? 'overview'
}

type AuthUser = { id: string; role: 'CITIZEN' | 'ADMIN'; citizenId?: string; adminId?: string; fullName: string }

export function WorkspaceApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [page, setPage] = useState<Page>(() => pageFromAdminPath(window.location.pathname))
  const [apps, setApps] = useState(seedApps)
  const [events, setEvents] = useState(seedEvents)
  const [query, setQuery] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [citizenTab, setCitizenTab] = useState<'track' | 'new'>('track')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<CitizenForm>({ name: '', email: '', business: '', address: '', identity: false, tax: false })
  useEffect(() => {
    const onPopState = () => setPage(pageFromAdminPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const navigate = (next: Page) => {
    setPage(next); setMobileNav(false); setNotice('')
    if (next !== 'citizen') {
      const target = `/admin/${adminPaths[next]}`
      if (window.location.pathname !== target) window.history.pushState({}, '', target)
    }
  }
  const record = (actor: string, action: string, detail: string, type: string) => {
    const time = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())
    setEvents((old) => [{ time, actor, action, detail, type }, ...old])
  }
  const approve = (id: string, index: number) => {
    const app = apps.find((item) => item.id === id)
    if (!app || index < 0) return
    const approvals = app.approvals.map((item, i) => i === index ? { ...item, status: 'approved' as const } : item)
    const finished = approvals.every((item) => item.status === 'approved')
    setApps((old) => old.map((item) => item.id === id ? { ...item, approvals, status: finished ? 'Approved' : 'In review', step: finished ? 'Complete' : approvals.find((item) => item.status !== 'approved')?.department ?? 'Complete' } : item))
    record('Municipal licensing', 'Approval recorded', `${id} · ${app.approvals[index].department}`, 'green')
    setNotice(`${id} updated. The applicant will be notified.`)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const id = `CIV-2026-${String(843 + Math.max(0, apps.length - 4)).padStart(4, '0')}`
    const application: Application = { id, name: form.name, service: 'Small business permit', submitted: 'Just now', due: 'Oct 05', status: 'In review', step: 'Municipal licensing', approvals: [
      { department: 'Identity verification', status: 'approved', initials: 'ID', color: 'mint' }, { department: 'Tax compliance', status: 'approved', initials: 'TX', color: 'blue' }, { department: 'Municipal licensing', status: 'pending', initials: 'ML', color: 'amber' },
    ] }
    setApps((old) => [application, ...old])
    record('MahaSetu Gateway', 'Application received', `${id} · Small business permit`, 'blue')
    record('Identity service', 'Identity verified', `${id} · Consent granted`, 'green')
    record('Revenue service', 'Tax status checked', `${id} · Read-only consent`, 'green')
    setNotice(`Application ${id} submitted. You can track it here.`)
    setForm({ name: '', email: '', business: '', address: '', identity: false, tax: false })
    setCitizenTab('track')
    setPage('citizen')
  }
  const pending = apps.reduce((count, item) => count + item.approvals.filter((step) => step.status !== 'approved').length, 0)
  const done = apps.filter((item) => item.status === 'Approved').length
  const filteredApps = apps.filter((item) => `${item.name} ${item.id} ${item.service} ${item.status}`.toLowerCase().includes(query.toLowerCase()))

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#overview" onClick={(e) => { e.preventDefault(); navigate('overview') }}><span className="brand-icon"><Globe2 size={19} /></span><span className="brand-text">Maha<span>Setu</span><small>CONNECTED SERVICES</small></span></a>
      <button className="workspace-select"><span className="workspace-mark">M</span><span><strong>MahaSetu Platform</strong><small>Administration</small></span><ChevronDown size={15} /></button>
      <div className="nav-label">PLATFORM OVERVIEW</div><nav className="primary-nav" aria-label="Admin navigation">
        <NavItem active={page === 'overview'} icon={<LayoutDashboard />} text="Dashboard" onClick={() => navigate('overview')} />
        {adminNavGroups.map((group) => <div className="admin-nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map((item) => <NavItem key={item.page} active={page === item.page} icon={item.icon} text={item.name} count={item.page === 'applications' ? apps.length : undefined} live={item.page === 'integrations'} onClick={() => navigate(item.page)} />)}</div>)}
      </nav>
      <div className="nav-label demo-label">DEMO EXPERIENCE</div><NavItem active={page === 'citizen'} icon={<UserRound />} text="Citizen portal" external onClick={() => navigate('citizen')} />
      <div className="sidebar-spacer" />
      <div className="sidebar-health"><div><i />All systems operational</div><small>4 connectors healthy <span>·</span> 42 ms avg.</small><button onClick={() => navigate('integrations')}>View system health <ArrowRight size={13} /></button></div>
      <button className="profile-button" onClick={onLogout}><span className="avatar staff-avatar">{initials(user.fullName)}</span><span><strong>{user.fullName}</strong><small>ADMIN ID {user.adminId} · Sign out</small></span><LogOut size={16} /></button>
    </aside>
    {mobileNav && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="breadcrumbs"><span>MahaSetu Administration</span><span>/</span><strong>{page === 'citizen' ? 'Citizen portal' : label(page)}</strong></div><div className="topbar-actions"><span className="demo-tag"><i />LOCAL DEMO</span><button className="icon-button" aria-label="Search applications" onClick={() => navigate('applications')}><Search size={17} /></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You are all caught up on notifications.')}><Bell size={17} /><i /></button><span className="top-divider" /><span className="avatar staff-avatar">{initials(user.fullName)}</span></div></header>
      <div className="page-content">
        {notice && <div role="status" className="notice-banner"><CheckCircle2 size={16} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
        {page === 'overview' && <Overview user={user} apps={apps} events={events} pending={pending} done={done} navigate={navigate} approve={approve} />}
        {page === 'applications' && <ApplicationsPage apps={filteredApps} allCount={apps.length} query={query} setQuery={setQuery} approve={approve} navigate={navigate} />}
        {page === 'integrations' && <IntegrationsPage />}
        {page === 'audit' && <AuditPage events={events} />}
        {page === 'citizen' && <CitizenPage apps={apps.filter((item) => item.name.toLowerCase() === 'maya patel' || item.submitted === 'Just now')} form={form} setForm={setForm} submit={submit} tab={citizenTab} setTab={setCitizenTab} />}
        {!['overview', 'applications', 'integrations', 'audit', 'citizen'].includes(page) && <AdminModule page={page} />}
      </div>
      <footer className="page-footer"><span><LockKeyhole size={12} />Local demo · No real citizen data is used</span><span>Connected services, one public network</span></footer>
    </main>
  </div>
}

function label(page: Page) { return ({ overview: 'Dashboard', citizens: 'Citizens', departments: 'Departments', services: 'Services', applications: 'Applications', workflows: 'Workflows', integrations: 'Integrations', 'api-gateway': 'API gateway', connectors: 'Connectors', 'data-standards': 'Data standards', 'master-data': 'Master data', consents: 'Consents', events: 'Events', notifications: 'Notifications', sla: 'SLA monitoring', exceptions: 'Exceptions', audit: 'Audit logs', analytics: 'Analytics', 'system-health': 'System health', 'developer-portal': 'Developer portal', settings: 'Settings', citizen: 'Citizen portal' } as const)[page] }
function NavItem({ active, icon, text, count, live, external, onClick }: { active: boolean; icon: ReactNode; text: string; count?: number; live?: boolean; external?: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}{text}{count !== undefined && <span className="nav-count">{count}</span>}{live && <i className="nav-live" />}{external && <ArrowUpRight className="nav-external" size={14} />}</button>
}
function Heading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div>{action}</div>}</div>
}
function Metric({ title, value, note, icon, color, trend }: { title: string; value: string; note: string; icon: ReactNode; color: string; trend: ReactNode }) {
  return <article className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${color}`}>{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-note"><span className={color}>{trend}</span>{note}</div></article>
}
function Status({ value }: { value: string }) { return <span className={`status-pill ${value.toLowerCase().replace(/ /g, '-')}`}><i />{value}</span> }
function FooterLink({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="surface-footer-link" onClick={onClick}>{children}<ArrowRight size={14} /></button> }

function Overview({ user, apps, events, pending, done, navigate, approve }: { user: AuthUser; apps: Application[]; events: EventItem[]; pending: number; done: number; navigate: (page: Page) => void; approve: (id: string, index: number) => void }) {
  const inProgress = apps.filter((item) => item.status !== 'Approved').length
  return <>
    <Heading eyebrow={`PLATFORM ADMINISTRATION · ADMIN ID ${user.adminId}`} title={`Good morning, ${user.fullName.split(' ')[0]}`} description="Here’s what’s moving across MahaSetu services today." action={<button className="button button-primary" onClick={() => navigate('citizen')}><Plus size={16} />New application</button>} />
    <section className="metric-grid"><Metric title="Open applications" value={String(inProgress).padStart(2, '0')} note="Across 3 services" icon={<FileClock />} color="metric-blue" trend={<ArrowUpRight size={13} />} /><Metric title="Awaiting action" value={String(pending).padStart(2, '0')} note="2 due within 24 hours" icon={<Clock3 />} color="metric-amber" trend={<ArrowDownRight size={13} />} /><Metric title="Completed this week" value={String(done + 18)} note="↑ 12% from last week" icon={<CheckCircle2 />} color="metric-green" trend={<ArrowUpRight size={13} />} /><Metric title="Average processing" value="1.8d" note="↓ 0.4 days this month" icon={<Activity />} color="metric-coral" trend={<ArrowDownRight size={13} />} /></section>
    <section className="overview-grid">
      <div className="surface"><div className="surface-heading"><div><h2>Needs attention</h2><p>Applications waiting on a department</p></div><button className="text-button" onClick={() => navigate('applications')}>View all <ArrowRight size={14} /></button></div>
        <div className="attention-list">{apps.filter((item) => item.status !== 'Approved').slice(0, 3).map((item) => { const index = item.approvals.findIndex((step) => step.status !== 'approved'); const step = item.approvals[index]; return <div className="attention-row" key={item.id}><span className={`department-icon ${step?.color ?? 'mint'}`}>{step?.initials ?? 'OK'}</span><div className="attention-main"><div className="attention-title"><strong>{item.service}</strong><span>{item.id}</span></div><div className="attention-sub">{item.name}<span>·</span>{step?.department}</div></div><div className="attention-due"><small>DUE {item.due.toUpperCase()}</small><Status value={item.status} /></div><button className="row-action" title="Record approval" aria-label={`Approve next step for ${item.name}`} onClick={() => approve(item.id, index)}><Check size={16} /></button></div> })}</div>
        <FooterLink onClick={() => navigate('applications')}>Open application queue</FooterLink>
      </div>
      <div className="surface"><div className="surface-heading"><div><h2>Live activity</h2><p>Latest events across the network</p></div><span className="live-label"><i />LIVE</span></div><div className="event-list">{events.slice(0, 4).map((event, i) => <EventRow key={`${event.time}-${i}`} event={event} />)}</div><FooterLink onClick={() => navigate('audit')}>View audit log</FooterLink></div>
    </section>
    <section className="lower-grid"><div className="surface"><div className="surface-heading"><div><h2>Permit workflow</h2><p>Small business permit · 3 connected services</p></div><button className="subtle-icon" aria-label="Workflow settings"><Settings2 size={17} /></button></div><div className="workflow-steps"><WorkflowStep number="01" title="Identity verification" department="Identity registry" state="complete" /><WorkflowStep number="02" title="Tax compliance" department="Revenue & tax" state="complete" /><WorkflowStep number="03" title="Municipal licensing" department="City licensing" state="active" /><WorkflowStep number="04" title="Permit issued" department="Applicant notified" state="upcoming" last /></div><FooterLink onClick={() => navigate('integrations')}>Configure workflow</FooterLink></div>
      <div className="surface"><div className="surface-heading"><div><h2>Connected systems</h2><p>Department connectors · live health</p></div><button className="text-button" onClick={() => navigate('integrations')}>Manage <ArrowRight size={14} /></button></div><div className="connector-mini-list">{connectorData.slice(0, 3).map((item) => <div className="connector-mini" key={item.name}><span className={`department-icon ${item.color}`}>{item.initials}</span><span className="connector-mini-name"><strong>{item.name}</strong><small>{item.type}</small></span><span className="system-up"><i />Connected</span></div>)}</div><div className="connector-footnote"><span><i />4 of 4 connectors healthy</span><span>42 ms avg. latency</span></div></div></section>
  </>
}
function EventRow({ event }: { event: EventItem }) { return <div className="event-row"><span className={`event-marker ${event.type}`}><i /></span><div className="event-copy"><div><strong>{event.action}</strong><span>{event.time}</span></div><small>{event.actor} <b>·</b> {event.detail}</small></div></div> }
function WorkflowStep({ number, title, department, state, last }: { number: string; title: string; department: string; state: 'complete' | 'active' | 'upcoming'; last?: boolean }) {
  return <div className={`workflow-step ${state}`}><div className="step-rail">{state === 'complete' ? <span className="step-check"><Check size={12} /></span> : <span className="step-number">{number}</span>}{!last && <span className="step-line" />}</div><div className="step-copy"><strong>{title}</strong><small>{department}</small></div><span className={state === 'active' ? 'step-in-progress' : state === 'complete' ? 'step-done' : 'step-wait'}>{state === 'active' ? <><i />In progress</> : state === 'complete' ? 'Complete' : 'Waiting'}</span></div>
}

function ApplicationsPage({ apps, allCount, query, setQuery, approve, navigate }: { apps: Application[]; allCount: number; query: string; setQuery: (value: string) => void; approve: (id: string, index: number) => void; navigate: (page: Page) => void }) {
  const [filter, setFilter] = useState('All applications')
  const shown = (filter === 'All applications' ? apps : apps.filter((item) => filter === 'Needs action' ? item.status !== 'Approved' : item.status === 'Approved'))
  return <><Heading eyebrow="SERVICE DELIVERY" title="Applications" description="Track requests as they move between connected departments." action={<button className="button button-primary" onClick={() => navigate('citizen')}><Plus size={16} />New application</button>} />
    <div className="surface table-surface"><div className="table-toolbar"><div className="filter-tabs">{['All applications', 'Needs action', 'Approved'].map((item) => <button key={item} className={filter === item ? 'filter-tab selected' : 'filter-tab'} onClick={() => setFilter(item)}>{item}{item === 'All applications' && <span>{allCount}</span>}</button>)}</div><label className="search-field"><Search size={15} /><input aria-label="Search applications" placeholder="Search by name or ID" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>Ctrl K</kbd></label></div>
      <div className="table-wrap"><table><thead><tr><th>APPLICANT</th><th>SERVICE</th><th>APPLICATION ID</th><th>DEPARTMENT STEP</th><th>STATUS</th><th>DUE DATE</th><th /></tr></thead><tbody>{shown.map((item) => { const index = item.approvals.findIndex((step) => step.status !== 'approved'); return <tr key={item.id}><td><span className="applicant-cell"><span className="avatar applicant-avatar">{initials(item.name)}</span><strong>{item.name}</strong></span></td><td>{item.service}</td><td><code>{item.id}</code></td><td><span className="step-cell"><i />{item.step}</span></td><td><Status value={item.status} /></td><td>{item.due}</td><td>{index >= 0 ? <button className="table-check" aria-label={`Approve next step for ${item.name}`} title="Record approval" onClick={() => approve(item.id, index)}><Check size={15} /></button> : <CheckCircle2 className="complete-icon" size={17} />}</td></tr> })}</tbody></table>{shown.length === 0 && <div className="empty-state"><Search size={21} /><strong>No applications found</strong><span>Try another search or filter.</span></div>}</div><div className="table-bottom"><span>Showing <strong>{shown.length}</strong> of <strong>{allCount}</strong> applications</span><span>Updated just now <RefreshCw size={12} /></span></div>
    </div><div className="info-strip"><ShieldCheck size={16} />Each status change is recorded in the audit log and shared with the applicant.</div></>
}
function initials(name: string) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() }

function IntegrationsPage() {
  const [feedback, setFeedback] = useState('')
  return <><Heading eyebrow="NETWORK ADMINISTRATION" title="Integrations" description="Department systems connected through the MahaSetu gateway." action={<button className="button button-secondary" onClick={() => setFeedback('All connectors checked just now.')}><RefreshCw size={15} />Test connections</button>} />
    {feedback && <div role="status" className="inline-feedback"><CheckCircle2 size={15} />{feedback}<button aria-label="Dismiss" onClick={() => setFeedback('')}><X size={14} /></button></div>}
    <div className="integration-summary"><div className="summary-healthy"><span><Check size={17} /></span><div><strong>All systems operational</strong><small>4 of 4 department connectors responding</small></div></div><div><small>AVG. RESPONSE</small><strong>42 <i>ms</i></strong></div><div><small>EVENTS TODAY</small><strong>1,284</strong></div><div><small>RETRY QUEUE</small><strong>03 <i>events</i></strong></div></div>
    <div className="section-heading"><div><h2>Department connectors</h2><p>Adapters normalize legacy and modern systems into one shared data model.</p></div><button className="button button-secondary" onClick={() => setFeedback('Connector setup is available in this demo workspace.')}><Plus size={15} />Add connector</button></div>
    <div className="integration-list">{connectorData.map((item, index) => <article className="integration-card" key={item.name}><span className={`department-icon ${item.color}`}>{item.initials}</span><div className="integration-title"><strong>{item.name}</strong><small>{item.type}</small></div><div className="integration-health"><span className="system-up"><i />Operational</span><small>Last sync 2 min ago</small></div><div className="integration-stat"><small>LATENCY</small><strong>{item.latency}</strong></div><div className="integration-stat"><small>30D UPTIME</small><strong>{item.uptime}</strong></div><button className="subtle-icon" aria-label={`Details for ${item.name}`} onClick={() => setFeedback(`${item.name}: connected, consent-gated, and audit logged.`)}><MoreHorizontal size={18} /></button>{index === 3 && <span className="connector-note"><Activity size={12} />Messages retry automatically after temporary failures.</span>}</article>)}</div>
    <div className="info-strip"><LockKeyhole size={15} />Data is exchanged only within the scope of a recorded citizen consent.<button onClick={() => setFeedback('Consent is required before any connected department data is requested.')}>View data policy <ArrowRight size={13} /></button></div></>
}
function AuditPage({ events }: { events: EventItem[] }) {
  const [actor, setActor] = useState('All activity')
  const actors = ['All activity', 'MahaSetu Gateway', 'Identity service', 'Revenue service', 'Municipal licensing']
  const visible = events.filter((event) => actor === 'All activity' || actor === event.actor)
  return <><Heading eyebrow="SECURITY & COMPLIANCE" title="Audit log" description="A traceable record of service access, decisions, and data exchange." action={<button className="button button-secondary" onClick={() => window.print()}><FileText size={15} />Export log</button>} />
    <div className="audit-callout"><span><ShieldCheck size={19} /></span><div><strong>Every exchange leaves a trace.</strong><p>Events record who accessed what, under which consent, and when. This demo log is held in local session state.</p></div><small>DEMO · SESSION ONLY</small></div>
    <div className="surface audit-surface"><div className="audit-toolbar"><div><h2>Event history</h2><span>{events.length} events</span></div><label className="select-wrap"><span className="sr-only">Filter by actor</span><select value={actor} onChange={(e) => setActor(e.target.value)}>{actors.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label></div>
      <div className="audit-table"><div className="audit-table-head"><span>TIME</span><span>ACTOR</span><span>EVENT</span><span>DETAILS</span></div>{visible.map((event, index) => <div className="audit-table-row" key={`${event.time}-${index}`}><span className="audit-time">{event.time}<small>SEP 30, 2026</small></span><span className="audit-actor"><i className={event.type} />{event.actor}</span><span>{event.action}</span><span className="audit-detail">{event.detail}<button aria-label={`Inspect ${event.action}`}><ArrowUpRight size={13} /></button></span></div>)}{visible.length === 0 && <div className="empty-state">No events for this actor yet.</div>}</div><div className="table-bottom"><span>Showing <strong>{visible.length}</strong> recorded events</span><span><LockKeyhole size={12} />Session event history</span></div></div>
  </>
}

const adminModuleDescriptions: Partial<Record<Page, string>> = {
  citizens: 'Review registered demo accounts and verified profile summaries.',
  departments: 'Monitor departments participating in the MahaSetu network.',
  services: 'Review public services connected to cross-department workflows.',
  workflows: 'Inspect reusable workflow definitions and their current state.',
  'api-gateway': 'Monitor API traffic, availability, and gateway policies.',
  connectors: 'Review adapters that translate between legacy and modern systems.',
  'data-standards': 'Explore shared formats used to exchange service data.',
  'master-data': 'Inspect sample master records and duplicate-resolution status.',
  consents: 'Review citizen permissions and their data-sharing scope.',
  events: 'Monitor workflow events and delivery outcomes.',
  notifications: 'Review queued and delivered service notifications.',
  sla: 'Track service deadlines and processing performance.',
  exceptions: 'Investigate integration failures and retry status.',
  analytics: 'Review illustrative service delivery indicators.',
  'system-health': 'Monitor the local demo connectors and service health.',
  'developer-portal': 'Explore API documentation and integration resources.',
  settings: 'Review platform and access-control settings for this demo.',
}

const adminDemoRows: Record<string, [string, string, string, string][]> = {
  citizens: [
    ['Maya Patel', '******3210 · Citizen ID 4827••••0521', 'Verified', 'Today, 09:42'],
    ['Jordan Lee', '******7814 · Citizen account', 'Verified', 'Today, 08:16'],
    ['Amara Okafor', '******1162 · Citizen account', 'Verified', 'Yesterday'],
  ],
  departments: connectorData.map((item) => [item.name, item.type, 'Connected', item.latency]),
  services: [
    ['Small business permit', 'Municipal · 3 departments', 'Published', '2 business days'],
    ['Food vendor license', 'Health + municipal', 'Published', '3 business days'],
    ['Home improvement grant', 'Housing + finance', 'In review', '5 business days'],
  ],
  workflows: [
    ['Permit approval', 'Identity → tax → licensing', 'Active', '3 steps'],
    ['Food vendor review', 'Identity → health → licensing', 'Active', '3 steps'],
    ['Grant eligibility', 'Identity → housing → finance', 'Active', '3 steps'],
  ],
  consents: [
    ['Identity verification', 'Small business permit · one-time', 'Granted', '09:42 today'],
    ['Tax compliance', 'Small business permit · read-only', 'Granted', '09:42 today'],
    ['Housing eligibility', 'Home improvement grant', 'Active', 'Sep 29'],
  ],
  exceptions: [
    ['Housing services queue', '3 messages waiting for retry', 'Retry queued', '2 min ago'],
    ['Revenue & tax', 'No current exceptions', 'Resolved', 'Yesterday'],
  ],
}

function AdminModule({ page }: { page: Page }) {
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState('')
  const description = adminModuleDescriptions[page] ?? `Review ${label(page).toLowerCase()} across the connected services network.`
  const rows = (adminDemoRows[page] ?? [
    ['Identity registry', 'REST API · v2.4', 'Operational', '82 ms'],
    ['Revenue & tax', 'Legacy adapter · SOAP', 'Operational', '146 ms'],
    ['Municipal licensing', 'REST API · v1.8', 'Operational', '104 ms'],
  ]).filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()))
  return <>
    <Heading eyebrow="PLATFORM ADMINISTRATION · DEMO DATA" title={label(page)} description={description} action={<button className="button button-secondary" onClick={() => setFeedback(`${label(page)} export is available in a connected deployment.`)}><FileText size={15} />Export view</button>} />
    {feedback && <div role="status" className="inline-feedback"><CheckCircle2 size={15} />{feedback}<button aria-label="Dismiss" onClick={() => setFeedback('')}><X size={14} /></button></div>}
    <section className="admin-module-metrics"><article><span>DEMO RECORDS</span><strong>{String(rows.length).padStart(2, '0')}</strong><small>Illustrative workspace data</small></article><article><span>NETWORK STATE</span><strong>Healthy</strong><small>Local mock connectors</small></article><article><span>LAST UPDATED</span><strong>Just now</strong><small>In-memory demo session</small></article><article><span>DATA SOURCE</span><strong>Mock</strong><small>No external system connected</small></article></section>
    <section className="surface admin-module-surface"><div className="surface-heading"><div><h2>{label(page)} registry</h2><p>Sample records for this local demonstration.</p></div><label className="search-field"><Search size={15} /><input aria-label={`Search ${label(page)}`} placeholder="Filter records" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div><div className="table-wrap"><table><thead><tr><th>NAME / RESOURCE</th><th>DETAILS</th><th>STATUS</th><th>UPDATED / METRIC</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}><td><strong className="module-record-name">{row[0]}</strong></td><td>{row[1]}</td><td><span className="module-state"><i />{row[2]}</span></td><td>{row[3]}</td><td><button className="subtle-icon" aria-label={`Inspect ${row[0]}`} title="Record details" onClick={() => setFeedback(`${row[0]} is mock data in this demo workspace.`)}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state"><Search size={20} /><strong>No matching records</strong><span>Try a different filter.</span></div>}</div><div className="table-bottom"><span>Showing <strong>{rows.length}</strong> sample records</span><span><LockKeyhole size={12} />Local demo data only</span></div></section>
    <div className="info-strip"><ShieldCheck size={15} />This module is illustrative. Production access, records, and actions require configured services and authorization.</div>
  </>
}

function CitizenPage({ apps, form, setForm, submit, tab, setTab }: { apps: Application[]; form: CitizenForm; setForm: React.Dispatch<React.SetStateAction<CitizenForm>>; submit: (event: FormEvent<HTMLFormElement>) => void; tab: 'track' | 'new'; setTab: (tab: 'track' | 'new') => void }) {
  return <div className="citizen-page"><section className="citizen-banner"><div className="citizen-banner-copy"><div className="citizen-overline"><span>✳</span> MAHASETU PUBLIC SERVICES</div><h1>One application.<br /><em>Connected services.</em></h1><p>Apply once. We’ll coordinate the departments and keep you updated at every step.</p><button className="button citizen-cta" onClick={() => { setTab('new'); document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Plus size={16} />Start an application <ArrowRight size={15} /></button><div className="citizen-trust"><span><LockKeyhole size={13} />You control your data</span><span><Fingerprint size={14} />Secure by design</span></div></div><div className="citizen-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-disc"><Globe2 size={57} strokeWidth={1.1} /><i className="node-a"><Check size={13} /></i><i className="node-b"><FileCheck2 size={13} /></i><i className="node-c"><UsersRound size={13} /></i></div><span className="art-tag tag-one">Identity verified</span><span className="art-tag tag-two">3 services connected</span></div></section>
    <div className="citizen-tabs"><button className={tab === 'track' ? 'citizen-tab selected' : 'citizen-tab'} onClick={() => setTab('track')}><FileClock size={15} />My applications <span>{apps.length}</span></button><button className={tab === 'new' ? 'citizen-tab selected' : 'citizen-tab'} onClick={() => { setTab('new'); document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' }) }}><Plus size={15} />New application</button><span className="citizen-signed-in"><span className="avatar applicant-avatar">MP</span>Maya Patel <ChevronDown size={14} /></span></div>
    {tab === 'track' ? <div className="citizen-applications"><div className="citizen-section-heading"><div><h2>Your applications</h2><p>Updates from every connected department, all in one place.</p></div><button className="button button-secondary" onClick={() => setTab('new')}><Plus size={15} />Apply for a service</button></div>{apps.length === 0 ? <div className="citizen-empty"><FileText size={21} /><strong>No applications yet</strong><span>Start a service request and track it here.</span></div> : apps.map((item) => <CitizenApplication key={item.id} application={item} />)}<div className="citizen-data-note"><ShieldCheck size={16} /><span>Your information is shared only with the departments needed for each service, and only with your permission.</span><CircleHelp size={15} /></div></div> : <form id="apply-form" className="application-form" onSubmit={submit}><div className="citizen-section-heading"><div><div className="eyebrow">SERVICE REQUEST · 3 MINUTES</div><h2>Small business permit</h2><p>Tell us a little about yourself and your business.</p></div><span className="form-step-count">STEP 01 <i>/</i> 02</span></div><div className="form-layout"><div className="form-fields"><div className="field-grid"><Field label="Full name" value={form.name} placeholder="e.g. Maya Patel" required onChange={(name) => setForm((old) => ({ ...old, name }))} /><Field label="Email address" value={form.email} placeholder="maya@example.com" type="email" required onChange={(email) => setForm((old) => ({ ...old, email }))} /><Field label="Business name" value={form.business} placeholder="Your registered business" required onChange={(business) => setForm((old) => ({ ...old, business }))} /><Field label="Business address" value={form.address} placeholder="Street address, Fairview" required onChange={(address) => setForm((old) => ({ ...old, address }))} /></div><div className="form-divider" /><div className="consent-heading"><div className="eyebrow">YOUR DATA, YOUR CHOICE</div><p>To process this permit, we need permission to ask two departments for limited information.</p></div><Consent checked={form.identity} setChecked={(identity) => setForm((old) => ({ ...old, identity }))} icon={<Fingerprint size={17} />} color="mint" title="Verify my identity" description="Identity Registry · confirm name and resident status" scope="One-time check" /><Consent checked={form.tax} setChecked={(tax) => setForm((old) => ({ ...old, tax }))} icon={<FileCheck2 size={17} />} color="blue" title="Check tax compliance" description="Revenue & Tax · read-only business standing" scope="One-time check" /><div className="consent-footnote"><LockKeyhole size={13} />You can review or withdraw consent at any time.</div><button type="submit" className="button button-primary form-submit">Review and continue <ArrowRight size={15} /></button></div><aside className="form-aside"><span><FileCheck2 size={19} /></span><h3>What happens next?</h3><AsideStep n="1" title="We verify" description="Your details are checked with your permission." /><AsideStep n="2" title="Departments coordinate" description="Licensing reviews your permit request." /><AsideStep n="3" title="You stay in the loop" description="Track updates here, in one place." /><div className="aside-time"><Clock3 size={14} />Usually completed in 2 business days</div></aside></div></form>}
  </div>
}
function Field({ label, value, placeholder, type = 'text', required, onChange }: { label: string; value: string; placeholder: string; type?: string; required?: boolean; onChange: (value: string) => void }) { return <label className="form-field"><span>{label}</span><input required={required} type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label> }
function Consent({ checked, setChecked, icon, color, title, description, scope }: { checked: boolean; setChecked: (checked: boolean) => void; icon: ReactNode; color: string; title: string; description: string; scope: string }) { return <label className="consent-row"><input type="checkbox" required checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span className="consent-check"><Check size={12} /></span><span className={`consent-icon ${color}`}>{icon}</span><span className="consent-copy"><strong>{title}</strong><small>{description}</small></span><span className="consent-scope">{scope}</span></label> }
function AsideStep({ n, title, description }: { n: string; title: string; description: string }) { return <div className="aside-step"><span>{n}</span><p><strong>{title}</strong><small>{description}</small></p></div> }
function CitizenApplication({ application }: { application: Application }) { return <article className="citizen-app-card"><div className="citizen-app-top"><span className="citizen-app-icon"><FileText size={18} /></span><div className="citizen-app-title"><strong>{application.service}</strong><small>{application.id} <i>·</i> Submitted {application.submitted.toLowerCase()}</small></div><Status value={application.status} /><button className="subtle-icon" aria-label="Application options"><MoreHorizontal size={18} /></button></div><div className="citizen-progress"><div><span>APPLICATION PROGRESS</span><span>{application.approvals.filter((step) => step.status === 'approved').length} of {application.approvals.length} steps complete</span></div><div className="progress-track">{application.approvals.map((step) => <i key={step.department} className={step.status === 'approved' ? 'done' : ''} />)}</div><div className="citizen-step-list">{application.approvals.map((step) => <span key={step.department} className={step.status === 'approved' ? 'is-done' : step.status === 'review' ? 'is-review' : ''}><i>{step.status === 'approved' ? <Check size={11} /> : step.status === 'review' ? <CircleHelp size={11} /> : <Clock3 size={11} />}</i>{step.department}</span>)}</div></div><div className="citizen-app-bottom"><span><Clock3 size={13} />Expected by {application.due}</span><span>Next: <strong>{application.step}</strong></span><button aria-label="View application details"><ArrowRight size={15} /></button></div></article> }

