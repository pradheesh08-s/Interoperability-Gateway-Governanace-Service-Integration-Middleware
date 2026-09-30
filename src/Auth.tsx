import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Bell, Building2, Check, CheckCircle2,
  CircleHelp, Clock3, Copy, FileCheck2, FileClock, FileText, Fingerprint,
  Globe2, HeartHandshake, HelpCircle, KeyRound, LayoutDashboard, LockKeyhole,
  LogOut, Menu, ShieldCheck, UsersRound, X,
} from 'lucide-react'
import { WorkspaceApp } from './App'

type User = { id: string; role: 'CITIZEN' | 'ADMIN'; citizenId?: string; adminId?: string; fullName: string; maskedMobile?: string }
type Challenge = { challengeId: string; mobileNumber: string; maskedMobile: string }
type ApiResult<T> = { success: boolean; data?: T; message?: string; retryAfter?: number; error?: { code: string; message: string }; requestId?: string }
type CitizenProfile = { fullName: string; dateOfBirth: string; gender: string; state: string; district: string; address: string; email: string }

async function api<T>(path: string, body?: unknown, method = 'POST'): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json() as ApiResult<T>
  if (!response.ok || !result.success) {
    const error = new Error(result.error?.message ?? 'We couldn’t process your request right now. Please try again.') as Error & { code?: string; retryAfter?: number; requestId?: string }
    error.code = result.error?.code
    error.retryAfter = result.retryAfter
    error.requestId = result.requestId
    throw error
  }
  return result
}

function move(path: string, replace = false) {
  if (replace) window.history.replaceState({}, '', path)
  else window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function AuthApp() {
  const [path, setPath] = useState(window.location.pathname)
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [verified, setVerified] = useState(false)
  const [notice, setNotice] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const needsSession = path.startsWith('/citizen/') || path.startsWith('/admin/') || path === '/auth/registration-success'
    if (!needsSession) {
      setChecking(false)
      return
    }
    if (user) {
      const correctRole = path.startsWith('/admin/') ? user.role === 'ADMIN' : path.startsWith('/citizen/') ? user.role === 'CITIZEN' : true
      if (!correctRole) move(user.role === 'ADMIN' ? '/admin/dashboard' : '/citizen/dashboard', true)
      setChecking(false)
      return
    }
    let cancelled = false
    api<{ user: User }>('/api/v1/auth/me', undefined, 'GET')
      .then((result) => { if (!cancelled && result.data) setUser(result.data.user) })
      .catch(() => { if (!cancelled) { setExpired(true); move('/auth/login', true) } })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [path, user])

  const signOut = async () => {
    try { await api('/api/v1/auth/logout') } catch { /* Local session may already have expired. */ }
    setUser(null)
    setChallenge(null)
    setVerified(false)
    setNotice('You have been signed out securely.')
    move('/auth/login')
  }

  if (checking) return <div className="auth-loading"><span className="brand-mark"><Globe2 size={22} /></span><span>Checking your MahaSetu session…</span></div>
  if (path.startsWith('/admin/')) return user?.role === 'ADMIN' ? <WorkspaceApp user={user} onLogout={signOut} /> : <AuthFrame go={move}><p>Redirecting to secure sign in…</p></AuthFrame>
  if (path.startsWith('/citizen/')) return user?.role === 'CITIZEN' ? <CitizenDashboard user={user} path={path} signOut={signOut} /> : <AuthFrame go={move}><p>Redirecting to secure sign in…</p></AuthFrame>
  if (path === '/auth/registration-success') return user ? <RegistrationSuccess user={user} go={move} /> : <Landing go={move} />
  if (path === '/auth/login') return <LoginPage go={move} setChallenge={setChallenge} notice={notice} clearNotice={() => setNotice('')} expired={expired} clearExpired={() => setExpired(false)} />
  if (path === '/auth/verify-otp') return challenge ? <VerifyPage challenge={challenge} setChallenge={setChallenge} setVerified={setVerified} setUser={setUser} go={move} /> : <Landing go={move} />
  if (path === '/auth/register/citizen') return verified && challenge ? <CitizenRegistration challenge={challenge} setUser={setUser} go={move} /> : <RegisterChoice verified={verified} go={move} />
  if (path === '/auth/register/admin') return verified && challenge ? <AdminRegistration challenge={challenge} setUser={setUser} go={move} /> : <RegisterChoice verified={verified} go={move} />
  if (path === '/auth/register') return <RegisterChoice verified={verified} go={move} />
  return <Landing go={move} />
}

function Brand({ light = false, go }: { light?: boolean; go: (path: string) => void }) {
  return <button className={`maha-brand ${light ? 'brand-light' : ''}`} onClick={() => go('/')}><span className="brand-mark"><Globe2 size={20} /></span><span>MahaSetu<small>ONE GOVERNMENT. CONNECTED SERVICES.</small></span></button>
}

function Landing({ go }: { go: (path: string) => void }) {
  return <div className="maha-landing"><header className="maha-header"><Brand go={go} /><nav className="maha-nav"><a href="#home">Home</a><a href="#services">Services</a><a href="#how-it-works">How It Works</a><a href="#help">Help</a></nav><button className="maha-login-link" onClick={() => go('/auth/login')}>Login <ArrowRight size={15} /></button><button className="mobile-auth-menu" aria-label="Login" onClick={() => go('/auth/login')}><Menu size={18} /></button></header>
    <main id="home"><section className="maha-hero"><div className="hero-copy"><div className="hero-kicker"><span /> DIGITAL PUBLIC INFRASTRUCTURE</div><h1>One Government.<br /><em>Connected Services.</em></h1><p>Access public services through one trusted digital gateway. Apply once, track every request, and stay in control of your data.</p><div className="hero-actions"><button className="maha-button primary" onClick={() => go('/auth/login')}>Login to MahaSetu <ArrowRight size={16} /></button><button className="maha-button outline" onClick={() => go('/auth/login')}>Explore services</button></div><div className="hero-assurance"><span><ShieldCheck size={15} /> Privacy-led access</span><span><Fingerprint size={15} /> Mobile verification</span><span><Globe2 size={15} /> Connected departments</span></div></div><div className="hero-visual" aria-label="Illustration of connected public services"><div className="map-grid" /><div className="orbit orbit-outer" /><div className="orbit orbit-inner" /><div className="hero-core"><Globe2 size={55} strokeWidth={1.15} /><span>MAHASETU</span></div><span className="service-node service-node-a"><Fingerprint size={19} /><small>Identity</small></span><span className="service-node service-node-b"><FileCheck2 size={19} /><small>Services</small></span><span className="service-node service-node-c"><Building2 size={19} /><small>Departments</small></span><span className="service-node service-node-d"><UsersRound size={19} /><small>Citizens</small></span><span className="orbit-caption">ONE CONNECTED NETWORK</span></div><div className="hero-index">01 <span>—</span> PUBLIC SERVICES, SIMPLIFIED</div></section>
    <section id="services" className="service-band"><div className="band-heading"><div className="hero-kicker">A SINGLE POINT OF ACCESS</div><h2>Government services,<br /><em>working together.</em></h2></div><div className="service-tiles"><article><span><FileText size={18} /></span><strong>Apply once</strong><p>Submit your information and supporting details in one clear flow.</p></article><article><span><Activity size={18} /></span><strong>Track in one place</strong><p>See progress and pending actions without visiting separate portals.</p></article><article><span><LockKeyhole size={18} /></span><strong>Share by consent</strong><p>Choose when participating departments may check relevant information.</p></article></div></section><section id="how-it-works" className="how-band"><span className="hero-kicker">HOW IT WORKS</span><div className="how-steps"><span><i>01</i>Verify your mobile</span><ArrowRight size={15} /><span><i>02</i>Access your account</span><ArrowRight size={15} /><span><i>03</i>Continue your service</span></div></section><footer id="help" className="maha-footer"><Brand go={go} /><span>Local demonstration · Not a live government service</span><button onClick={() => go('/auth/login')}><HelpCircle size={14} /> Help and sign in</button></footer></main></div>
}

function AuthFrame({ children, go, page = 'login' }: { children: ReactNode; go: (path: string) => void; page?: string }) {
  return <div className="auth-page"><header className="auth-header"><Brand go={go} /><div className="auth-header-right"><span>Secure access to public services</span><button onClick={() => go('/')}>Home</button><button onClick={() => go('/auth/login')}>Help</button></div></header><main className="auth-layout"><aside className="auth-story"><div className="hero-kicker"><span /> MAHASETU DIGITAL SERVICES</div><h1>One Government.<br /><em>Connected Services.</em></h1><p>One secure gateway for public services, applications, and updates.</p><div className="story-checks"><span><CheckCircle2 size={15} />A single account for connected services</span><span><CheckCircle2 size={15} />Mobile verification for secure access</span><span><CheckCircle2 size={15} />You choose when your data is shared</span></div><div className="auth-story-art"><div className="story-orbit" /><Globe2 size={43} /><span className="story-dot dot-one" /><span className="story-dot dot-two" /><span className="story-dot dot-three" /></div><small className="auth-demo-note">DEMO ENVIRONMENT · USE NON-SENSITIVE SAMPLE DATA</small></aside><section className="auth-main"><div className="auth-card">{children}</div><div className="auth-card-foot"><LockKeyhole size={12} />Your session is protected with a secure, HttpOnly cookie.</div></section></main><footer className="auth-footer"><span>© 2026 MahaSetu · Local demo</span><span><a href="#privacy">Privacy</a><a href="#accessibility">Accessibility</a><a href="#support">Support</a></span><span className="auth-route-tag">{page.toUpperCase()}</span></footer></div>
}

function LoginPage({ go, setChallenge, notice, clearNotice, expired, clearExpired }: { go: (path: string) => void; setChallenge: (challenge: Challenge) => void; notice: string; clearNotice: () => void; expired: boolean; clearExpired: () => void }) {
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const valid = /^[6-9]\d{9}$/.test(mobile)
  const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!valid) { setError('Enter a valid 10-digit Indian mobile number.'); return }
    setLoading(true)
    try {
      const result = await api<Challenge>('/api/v1/auth/request-otp', { mobileNumber: mobile })
      if (result.data) {
        setChallenge(result.data)
        go('/auth/verify-otp')
      }
    } catch (caught) {
      const failure = caught as Error & { retryAfter?: number; requestId?: string }
      setError(failure.message + (failure.retryAfter ? ` Try again in ${failure.retryAfter} seconds.` : '') + (failure.requestId ? ` Reference ${failure.requestId}.` : ''))
    } finally { setLoading(false) }
  }
  return <AuthFrame go={go} page="login"><button className="auth-back" onClick={() => go('/')}><ArrowLeft size={14} />Back to home</button><div className="auth-card-eyebrow">MAHASETU ACCOUNT</div><h2>Welcome back</h2><p className="auth-intro">Sign in securely using your registered mobile number.</p>{expired && <div className="auth-alert"><Clock3 size={15} /><span>Your session has expired. For your security, please log in again.</span><button aria-label="Dismiss" onClick={clearExpired}><X size={14} /></button></div>}{error && <AuthError message={error} />}
    <form onSubmit={sendOtp} className="auth-form"><label className="auth-field"><span>Mobile number</span><div className="mobile-input"><span className="country-code">+91</span><i /><input autoComplete="tel-national" inputMode="numeric" type="tel" maxLength={10} placeholder="10-digit mobile number" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))} aria-describedby="mobile-hint" /></div><small id="mobile-hint">Use a valid Indian mobile number beginning with 6–9.</small></label><button className="maha-button primary submit-button" disabled={loading || !valid}>{loading ? <><span className="button-spinner" />Sending OTP…</> : <>Send OTP <ArrowRight size={16} /></>}</button><div className="privacy-hint"><LockKeyhole size={13} /><span>For your privacy, we won’t confirm whether a number has an account until it’s verified.</span></div></form>
    {notice && <div className="auth-success"><CheckCircle2 size={15} /><span>{notice}</span><button aria-label="Dismiss" onClick={clearNotice}><X size={14} /></button></div>}<div className="auth-register-prompt"><span>New to MahaSetu?</span><button onClick={() => go('/auth/register')}>Register as Citizen <ArrowRight size={14} /></button></div><div className="admin-invite-line"><Building2 size={14} /><span>Platform administrators register by invitation after mobile verification.</span><button onClick={() => go('/auth/register')}>Admin registration</button></div>
  </AuthFrame>
}

function VerifyPage({ challenge, setChallenge, setVerified, setUser, go }: { challenge: Challenge; setChallenge: (challenge: Challenge | null) => void; setVerified: (verified: boolean) => void; setUser: (user: User | null) => void; go: (path: string, replace?: boolean) => void }) {
  const [otp, setOtp] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [expiresIn, setExpiresIn] = useState(300)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  useEffect(() => {
    const timer = window.setInterval(() => { setRemaining((value) => Math.max(0, value - 1)); setExpiresIn((value) => Math.max(0, value - 1)) }, 1000)
    return () => window.clearInterval(timer)
  }, [])
  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const chars = otp.padEnd(6, ' ').split('')
    chars[index] = digit || ' '
    const next = chars.join('').trimEnd()
    setOtp(next)
    if (digit && index < 5) inputs.current[index + 1]?.focus()
  }
  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (otp.length !== 6) { setError('Enter all 6 digits from your OTP.'); return }
    setBusy(true); setError('')
    try {
      const result = await api<{ accountFound: boolean; challengeId: string; mobileNumber?: string; user?: User }>('/api/v1/auth/verify-otp', { challengeId: challenge.challengeId, otp })
      if (result.data?.accountFound && result.data.user) {
        setUser(result.data.user)
        go(result.data.user.role === 'ADMIN' ? '/admin/dashboard' : '/citizen/dashboard', true)
      } else if (result.data) {
        setVerified(true)
        setChallenge({ ...challenge, challengeId: result.data.challengeId, mobileNumber: result.data.mobileNumber ?? challenge.mobileNumber })
        go('/auth/register')
      }
    } catch (caught) {
      const failure = caught as Error & { code?: string; requestId?: string }
      setError(failure.message + (failure.requestId ? ` Reference ${failure.requestId}.` : ''))
      if (failure.code === 'OTP_EXPIRED' || failure.code === 'OTP_LOCKED' || failure.code === 'INVALID_CHALLENGE') setDemoOtp('')
    } finally { setBusy(false) }
  }
  const resend = async () => {
    if (remaining > 0 || busy) return
    setBusy(true); setError(''); setDemoOtp('')
    try {
      const result = await api<Challenge>('/api/v1/auth/request-otp', { mobileNumber: challenge.mobileNumber })
      if (result.data) { setChallenge(result.data); setOtp(''); setRemaining(30); setExpiresIn(300); inputs.current[0]?.focus() }
    } catch (caught) {
      const failure = caught as Error & { retryAfter?: number }
      setError(failure.message)
      setRemaining(failure.retryAfter ?? 30)
    } finally { setBusy(false) }
  }
  const showDemoSms = async () => {
    try {
      const result = await api<{ otp: string }>(`/api/v1/demo/sms/${challenge.challengeId}`, undefined, 'GET')
      if (result.data) setDemoOtp(result.data.otp)
    } catch (caught) { setError((caught as Error).message) }
  }
  const timeText = `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}`
  return <AuthFrame go={go} page="verify"><button className="auth-back" onClick={() => go('/auth/login')}><ArrowLeft size={14} />Change mobile number</button><div className="auth-card-eyebrow">MOBILE VERIFICATION</div><span className="auth-large-icon"><KeyRound size={21} /></span><h2>Verify your mobile number</h2><p className="auth-intro">We sent a 6-digit OTP to <strong>{challenge.maskedMobile}</strong></p>{error && <AuthError message={error} />}{expiresIn === 0 && <div className="auth-alert"><Clock3 size={15} />This OTP has expired. Please request a new OTP.</div>}
    <form className="auth-form" onSubmit={verify}><label className="otp-label" htmlFor="otp-digit-0">Enter 6-digit OTP</label><div className="otp-inputs">{Array.from({ length: 6 }, (_, index) => <input key={index} ref={(element) => { inputs.current[index] = element }} id={`otp-digit-${index}`} aria-label={`OTP digit ${index + 1}`} autoComplete={index === 0 ? 'one-time-code' : 'off'} inputMode="numeric" type="text" maxLength={1} value={otp[index] ?? ''} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus() }} onPaste={(event) => { const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (pasted) { event.preventDefault(); setOtp(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus() } }} />)}</div><div className="otp-expiry"><Clock3 size={13} />OTP expires in <strong>{timeText}</strong></div><button className="maha-button primary submit-button" disabled={busy || otp.length !== 6 || expiresIn === 0}>{busy ? 'Verifying…' : <>Verify &amp; Continue <ArrowRight size={16} /></>}</button></form>
    <div className="resend-row"><span>Didn’t receive the OTP?</span><button disabled={remaining > 0 || busy} onClick={resend}>{remaining > 0 ? `Resend available in ${remaining}s` : 'Resend OTP'}</button></div><div className="demo-sms"><div><span className="demo-sms-dot" /><span>Local demo SMS · no message is sent</span></div><button onClick={showDemoSms}>Open demo inbox</button>{demoOtp && <div className="demo-code"><span>Demo verification code</span><strong>{demoOtp}</strong><button onClick={() => { setOtp(demoOtp); inputs.current[0]?.focus() }}>Use code</button></div>}</div>
  </AuthFrame>
}

function RegisterChoice({ verified, go }: { verified: boolean; go: (path: string) => void }) {
  return <AuthFrame go={go} page="register"><button className="auth-back" onClick={() => go('/auth/login')}><ArrowLeft size={14} />Back to login</button><div className="auth-card-eyebrow">ACCOUNT SETUP</div><span className="auth-large-icon"><CheckCircle2 size={21} /></span><h2>Welcome to MahaSetu</h2><p className="auth-intro">{verified ? 'Your mobile number is verified. Choose the account setup that applies to you.' : 'Verify your mobile number before creating an account.'}</p>{verified ? <div className="role-options"><button onClick={() => go('/auth/register/citizen')}><span className="role-icon citizen-role"><UserRoundIcon /></span><span><strong>Register as Citizen</strong><small>Create an account to access public services.</small></span><ArrowRight size={16} /></button><button onClick={() => go('/auth/register/admin')}><span className="role-icon admin-role"><Building2 size={18} /></span><span><strong>Admin registration</strong><small>Invitation required · platform access</small></span><ArrowRight size={16} /></button></div> : <button className="maha-button primary submit-button" onClick={() => go('/auth/login')}>Verify mobile number <ArrowRight size={16} /></button>}<p className="admin-security-note"><ShieldCheck size={14} />Admin accounts require an invitation validated by the server.</p></AuthFrame>
}

function CitizenRegistration({ challenge, setUser, go }: { challenge: Challenge; setUser: (user: User | null) => void; go: (path: string) => void }) {
  const [profile, setProfile] = useState<CitizenProfile>({ fullName: '', dateOfBirth: '', gender: '', state: '', district: '', address: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key: keyof CitizenProfile, value: string) => setProfile((old) => ({ ...old, [key]: value }))
  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await api<{ user: User }>('/api/v1/auth/register/citizen', { ...profile, mobileNumber: challenge.mobileNumber, challengeId: challenge.challengeId })
      if (result.data) { setUser(result.data.user); go('/auth/registration-success') }
    } catch (caught) { setError((caught as Error).message) }
    finally { setBusy(false) }
  }
  return <AuthFrame go={go} page="citizen registration"><button className="auth-back" onClick={() => go('/auth/register')}><ArrowLeft size={14} />Registration options</button><div className="auth-card-eyebrow">CITIZEN ACCOUNT · STEP 1 OF 1</div><h2>Create your MahaSetu account</h2><p className="auth-intro">Add the details needed to set up your citizen profile.</p><VerifiedMobile mobile={challenge.mobileNumber} /><form className="registration-form" onSubmit={register}>{error && <AuthError message={error} />}<div className="registration-grid"><AuthInput label="Full name" value={profile.fullName} onChange={(value) => set('fullName', value)} placeholder="As shown on your official records" required /><AuthInput label="Date of birth" value={profile.dateOfBirth} onChange={(value) => set('dateOfBirth', value)} type="date" required /><label className="auth-field"><span>Gender</span><select required value={profile.gender} onChange={(event) => set('gender', event.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><AuthInput label="State" value={profile.state} onChange={(value) => set('state', value)} placeholder="State or union territory" required /><AuthInput label="District" value={profile.district} onChange={(value) => set('district', value)} placeholder="District" required /><AuthInput label="Email (optional)" value={profile.email} onChange={(value) => set('email', value)} type="email" placeholder="you@example.com" /><label className="auth-field field-span"><span>Residential address</span><textarea required value={profile.address} onChange={(event) => set('address', event.target.value)} placeholder="House / street, locality, PIN code" rows={2} /></label></div><div className="auth-form-note"><LockKeyhole size={13} />Only information needed to create your service account is collected.</div><button className="maha-button primary submit-button" disabled={busy}>{busy ? 'Creating account…' : <>Create account <ArrowRight size={16} /></>}</button></form></AuthFrame>
}

function AdminRegistration({ challenge, setUser, go }: { challenge: Challenge; setUser: (user: User | null) => void; go: (path: string) => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await api<{ user: User }>('/api/v1/auth/register/admin', { challengeId: challenge.challengeId, mobileNumber: challenge.mobileNumber, fullName, email, invitationCode })
      if (result.data) { setUser(result.data.user); go('/auth/registration-success') }
    } catch (caught) { setError((caught as Error).message) }
    finally { setBusy(false) }
  }
  return <AuthFrame go={go} page="admin registration"><button className="auth-back" onClick={() => go('/auth/register')}><ArrowLeft size={14} />Registration options</button><div className="auth-card-eyebrow">RESTRICTED PLATFORM ACCESS</div><h2>Create Admin Account</h2><p className="auth-intro">An invitation and verified mobile number are required.</p><VerifiedMobile mobile={challenge.mobileNumber} />{error && <AuthError message={error} />}<form className="auth-form registration-form" onSubmit={submit}><AuthInput label="Admin invitation code" value={invitationCode} onChange={setInvitationCode} placeholder="Enter invitation code" required /><AuthInput label="Full name" value={fullName} onChange={setFullName} placeholder="Full name" required /><AuthInput label="Email address" value={email} onChange={setEmail} type="email" placeholder="name@department.gov" required /><div className="admin-security-note"><ShieldCheck size={14} />Invitation validation happens on the server. The code is never stored in this app.</div><button className="maha-button primary submit-button" disabled={busy}>{busy ? 'Validating invitation…' : <>Create Admin Account <ArrowRight size={16} /></>}</button></form></AuthFrame>
}

function RegistrationSuccess({ user, go }: { user: User; go: (path: string, replace?: boolean) => void }) {
  const [copied, setCopied] = useState(false)
  const id = user.role === 'ADMIN' ? user.adminId : user.citizenId
  const copyId = async () => { if (!id) return; try { await navigator.clipboard.writeText(id); setCopied(true) } catch { setCopied(false) } }
  const downloadId = () => { if (!id) return; const file = new Blob([`MahaSetu ${user.role === 'ADMIN' ? 'Admin' : 'Citizen'} ID: ${id}\nName: ${user.fullName}\n\nLocal demo credential card. Keep this ID safe.`], { type: 'text/plain' }); const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = `mahasetu-${user.role.toLowerCase()}-id.txt`; link.click(); URL.revokeObjectURL(url) }
  const destination = user.role === 'ADMIN' ? '/admin/dashboard' : '/citizen/dashboard'
  return <div className="success-page"><header className="success-header"><Brand go={go} /><span><LockKeyhole size={13} />Authenticated session created</span></header><main className="success-main"><span className="success-check"><Check size={24} /></span><div className="auth-card-eyebrow">REGISTRATION COMPLETE</div><h1>{user.role === 'ADMIN' ? 'Admin account created' : 'Account created successfully'}</h1><p>Welcome to MahaSetu, <strong>{user.fullName}</strong>.</p><div className="id-card"><div className="id-card-top"><span><Globe2 size={15} /> MAHASETU · {user.role === 'ADMIN' ? 'ADMINISTRATION' : 'CITIZEN'}</span><ShieldCheck size={16} /></div><small>Your {user.role === 'ADMIN' ? 'Admin' : 'MahaSetu Citizen'} ID</small><strong>{id}</strong><span>Mobile number · +91 {user.maskedMobile ?? '******'}</span></div><div className="id-actions"><button className="maha-button outline" onClick={copyId}><Copy size={15} />{copied ? 'Copied' : 'Copy ID'}</button>{user.role === 'CITIZEN' && <button className="maha-button outline" onClick={downloadId}><FileText size={15} />Download ID</button>}</div><p className="id-safe-note"><LockKeyhole size={14} />Keep your ID safe. It may be needed when using services or contacting support.</p><button className="maha-button primary success-continue" onClick={() => go(destination, true)}>{user.role === 'ADMIN' ? 'Open Admin Dashboard' : 'Continue to Dashboard'} <ArrowRight size={16} /></button><p className="no-second-otp">Your verified mobile established this session. No second OTP is needed.</p></main></div>
}

function CitizenDashboard({ user, path, signOut }: { user: User; path: string; signOut: () => void }) {
  const nav = [
    { path: '/citizen/dashboard', name: 'Overview', icon: <LayoutDashboard size={16} /> },
    { path: '/citizen/services', name: 'Find a service', icon: <SearchIcon /> },
    { path: '/citizen/applications', name: 'My applications', icon: <FileClock size={16} /> },
    { path: '/citizen/consents', name: 'Manage consents', icon: <ShieldCheck size={16} /> },
    { path: '/citizen/documents', name: 'Documents', icon: <FileText size={16} /> },
    { path: '/citizen/notifications', name: 'Notifications', icon: <Bell size={16} /> },
    { path: '/citizen/grievances', name: 'Grievances', icon: <HeartHandshake size={16} /> },
    { path: '/citizen/profile', name: 'My profile', icon: <UserRoundIcon /> },
  ]
  const active = nav.find((item) => item.path === path)?.name ?? (path.startsWith('/citizen/services/') ? 'Service details' : path.startsWith('/citizen/applications/') ? 'Application details' : 'Overview')
  return <div className="citizen-shell"><aside className="citizen-sidebar"><Brand go={(next) => move(next)} light /><span className="portal-tag">CITIZEN PORTAL</span><nav aria-label="Citizen services">{nav.map((item) => <a key={item.path} className={item.path === path ? 'selected' : ''} href={item.path} onClick={(event) => { event.preventDefault(); move(item.path) }}>{item.icon}{item.name}{item.path === '/citizen/notifications' && <i className="unread-dot" />}</a>)}</nav><div className="citizen-sidebar-bottom"><span><span className="avatar citizen-user-avatar">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{user.fullName}</strong><small>Citizen account</small></span></span><button onClick={signOut} aria-label="Sign out"><LogOut size={16} /></button></div></aside><main className="citizen-main"><header className="citizen-topbar"><div><span>MahaSetu</span><b>/</b><strong>{active}</strong></div><span className="citizen-top-actions"><span className="secure-status"><i />SESSION ACTIVE</span><button onClick={() => move('/citizen/notifications')} aria-label="Notifications"><Bell size={17} /></button></span></header><div className="citizen-dashboard-content">{path === '/citizen/dashboard' ? <CitizenOverview user={user} /> : <CitizenModule path={path} user={user} />}</div><footer className="citizen-dashboard-footer"><span><LockKeyhole size={12} />Local demo · No real citizen data</span><button onClick={signOut}>Sign out <LogOut size={13} /></button></footer></main></div>
}

function CitizenOverview({ user }: { user: User }) {
  return <><div className="citizen-welcome"><div><div className="auth-card-eyebrow">WEDNESDAY · SEPTEMBER 30, 2026</div><h1>Welcome, {user.fullName.split(' ')[0]}</h1><p>Your connected services and application updates, all in one place.</p></div><div className="citizen-id-chip"><span>YOUR CITIZEN ID</span><strong>{user.citizenId}</strong><button onClick={() => navigator.clipboard?.writeText(user.citizenId ?? '')}><Copy size={13} />Copy ID</button></div></div><div className="citizen-dashboard-stats"><DashboardStat label="My applications" value="02" caption="1 needs attention" icon={<FileClock size={17} />} /><DashboardStat label="Pending actions" value="01" caption="Document requested" icon={<Clock3 size={17} />} /><DashboardStat label="Active consents" value="03" caption="You’re in control" icon={<ShieldCheck size={17} />} /><DashboardStat label="Notifications" value="02" caption="1 unread update" icon={<Bell size={17} />} /></div><section className="dashboard-section"><div className="dashboard-section-heading"><div><h2>Continue where you left off</h2><p>Latest updates from your applications</p></div><a href="/citizen/applications" onClick={(event) => { event.preventDefault(); move('/citizen/applications') }}>All applications <ArrowRight size={14} /></a></div><CitizenApplicationCard id="MS-2026-0842" title="Small business permit" state="In review" next="Municipal licensing" date="Expected Oct 02" progress={2} /><CitizenApplicationCard id="MS-2026-0841" title="Food vendor license" state="Action needed" next="Upload food handling certificate" date="Due Oct 01" progress={1} /></section><section className="dashboard-section quick-section"><div className="dashboard-section-heading"><div><h2>What would you like to do?</h2><p>Common service actions</p></div></div><div className="quick-actions"><QuickAction path="/citizen/services" icon={<SearchIcon />} title="Find a service" note="Explore available services" /><QuickAction path="/citizen/consents" icon={<ShieldCheck size={17} />} title="Manage consents" note="Review data-sharing choices" /><QuickAction path="/citizen/documents" icon={<FileText size={17} />} title="View documents" note="Your service documents" /><QuickAction path="/citizen/grievances" icon={<HeartHandshake size={17} />} title="Raise a grievance" note="Get help with a service" /></div></section></>
}
function DashboardStat({ label, value, caption, icon }: { label: string; value: string; caption: string; icon: ReactNode }) { return <article><div><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{caption}</small></article> }
function CitizenApplicationCard({ id, title, state, next, date, progress }: { id: string; title: string; state: string; next: string; date: string; progress: number }) { return <article className="citizen-dashboard-app"><span className="dashboard-app-icon"><FileCheck2 size={17} /></span><div className="dashboard-app-info"><span>{id} · PUBLIC SERVICE</span><strong>{title}</strong><small>Next: {next}</small></div><div className="dashboard-app-progress"><div><i style={{ width: `${progress * 33}%` }} /></div><span>{progress} of 3 steps</span></div><div className="dashboard-app-state"><StatePill value={state} /><small>{date}</small></div><ArrowRight className="dashboard-app-arrow" size={16} /></article> }
function StatePill({ value }: { value: string }) { return <span className={`state-pill ${value.toLowerCase().replace(/ /g, '-')}`}><i />{value}</span> }
function QuickAction({ path, icon, title, note }: { path: string; icon: ReactNode; title: string; note: string }) { return <a className="quick-action" href={path} onClick={(event) => { event.preventDefault(); move(path) }}><i>{icon}</i><span><strong>{title}</strong><small>{note}</small></span><ArrowRight size={15} /></a> }
function CitizenModule({ path, user }: { path: string; user: User }) {
  const [query, setQuery] = useState('')
  const title = path.startsWith('/citizen/services/') ? 'Service details' : path.startsWith('/citizen/applications/') ? 'Application details' : ({ '/citizen/services': 'Find a service', '/citizen/applications': 'My applications', '/citizen/consents': 'Manage consents', '/citizen/documents': 'Documents', '/citizen/notifications': 'Notifications', '/citizen/grievances': 'Grievances', '/citizen/profile': 'My profile' } as Record<string, string>)[path] ?? 'Citizen services'
  return <><div className="module-heading"><div><div className="auth-card-eyebrow">CITIZEN SERVICES</div><h1>{title}</h1><p>Manage your services and personal information securely through MahaSetu.</p></div>{path === '/citizen/services' && <label className="module-search"><SearchIcon /><input placeholder="Search services" value={query} onChange={(event) => setQuery(event.target.value)} /></label>}</div>{path === '/citizen/profile' ? <div className="profile-summary"><span className="profile-summary-icon"><UserRoundIcon /></span><div><span>VERIFIED CITIZEN</span><h2>{user.fullName}</h2><p>Citizen ID · {user.citizenId}</p><p>Mobile · Verified during sign in</p></div><CheckCircle2 size={18} /></div> : path === '/citizen/consents' ? <div className="module-list"><ConsentItem title="Identity verification" department="Identity Registry" scope="Small business permit · One-time check" active /><ConsentItem title="Tax compliance status" department="Revenue & Tax" scope="Small business permit · Read-only" active /><ConsentItem title="Housing eligibility" department="Housing Services" scope="Home improvement grant · Until Oct 15" active /><div className="module-note"><ShieldCheck size={15} />A consent can be reviewed or withdrawn. This demo does not contact real departments.</div></div> : path === '/citizen/services' || path.startsWith('/citizen/services/') ? <div className="service-catalog">{['Small business permit', 'Food vendor license', 'Home improvement grant', 'Birth certificate copy'].filter((name) => name.toLowerCase().includes(query.toLowerCase())).map((name, i) => <article key={name}><span className="catalog-icon">{i % 2 ? <Building2 size={17} /> : <FileText size={17} />}</span><div><small>{i < 2 ? 'BUSINESS & TRADE' : 'CITIZEN SERVICES'}</small><strong>{name}</strong><p>Apply online and track progress across the departments involved.</p><span className="catalog-time"><Clock3 size={12} />About 5 minutes to apply</span></div><button onClick={() => move('/citizen/applications')}>Start application <ArrowRight size={14} /></button></article>)}</div> : path === '/citizen/applications' || path.startsWith('/citizen/applications/') ? <div className="dashboard-section"><CitizenApplicationCard id="MS-2026-0842" title="Small business permit" state="In review" next="Municipal licensing" date="Expected Oct 02" progress={2} /><CitizenApplicationCard id="MS-2026-0841" title="Food vendor license" state="Action needed" next="Upload food handling certificate" date="Due Oct 01" progress={1} /></div> : path === '/citizen/documents' ? <div className="empty-module"><FileText size={24} /><strong>No documents to display</strong><span>Documents from your applications will appear here.</span></div> : path === '/citizen/notifications' ? <div className="module-list"><NotificationItem title="Document needed for your Food vendor license" time="Today · 9:18 AM" /><NotificationItem title="Tax status verified for Small business permit" time="Today · 9:02 AM" /><NotificationItem title="Application received" time="Yesterday · 4:36 PM" /></div> : path === '/citizen/grievances' ? <GrievanceForm /> : <div className="empty-module"><CircleHelp size={24} /><strong>Service information</strong><span>This local demo section is ready to connect to a configured public service.</span></div>}</>
}
function ConsentItem({ title, department, scope, active }: { title: string; department: string; scope: string; active: boolean }) { const [enabled, setEnabled] = useState(active); return <article className="consent-item"><span className="consent-item-icon"><ShieldCheck size={17} /></span><div><strong>{title}</strong><small>{department} · {scope}</small></div><span className="consent-active">{enabled ? 'Active' : 'Withdrawn'}</span><button className={`consent-toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Withdraw' : 'Restore'} ${title} consent`} onClick={() => setEnabled(!enabled)}><i /></button></article> }
function NotificationItem({ title, time }: { title: string; time: string }) { return <article className="notification-item"><span><Bell size={15} /></span><div><strong>{title}</strong><small>{time}</small></div><ArrowRight size={15} /></article> }
function GrievanceForm() { const [sent, setSent] = useState(false); return sent ? <div className="success-inline"><CheckCircle2 size={20} /><strong>Your request has been recorded.</strong><span>Reference GRV-2026-0021 · Local demo only</span></div> : <form className="grievance-form" onSubmit={(event) => { event.preventDefault(); setSent(true) }}><label className="auth-field"><span>Related service</span><select required defaultValue=""><option value="" disabled>Select a service</option><option>Small business permit</option><option>Food vendor license</option><option>Other</option></select></label><label className="auth-field"><span>What do you need help with?</span><textarea rows={4} required placeholder="Describe the issue. Do not include highly sensitive information." /></label><button className="maha-button primary">Submit grievance <ArrowRight size={15} /></button></form> }
function AuthInput({ label, value, onChange, placeholder = '', type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) { return <label className="auth-field"><span>{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label> }
function VerifiedMobile({ mobile }: { mobile: string }) { return <div className="verified-mobile"><span><LockKeyhole size={15} />Mobile number</span><strong>+91 {mobile}<i><Check size={11} />Verified</i></strong></div> }
function AuthError({ message }: { message: string }) { return <div role="alert" className="auth-error"><X size={15} /><span>{message}</span></div> }
function UserRoundIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg> }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg> }
