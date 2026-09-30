import crypto from 'node:crypto'
import express from 'express'

const app = express()
const port = Number(process.env.AUTH_PORT || 3001)
const otpSecret = crypto.randomBytes(32)
const challenges = new Map()
const demoSms = new Map()
const users = new Map([
  ['9876543210', { id: 'USR-DEMO-CITIZEN', role: 'CITIZEN', citizenId: '482716390521', fullName: 'Maya Patel', mobileNumber: '9876543210', profile: { state: 'Maharashtra', district: 'Pune' } }],
  ['9999999999', { id: 'USR-DEMO-ADMIN', role: 'ADMIN', adminId: '739184625301', fullName: 'Platform Administrator', mobileNumber: '9999999999' }],
])
const sessions = new Map()
const requestWindows = new Map()
const auditEvents = []
const citizenIds = new Set([...users.values()].filter((user) => user.citizenId).map((user) => user.citizenId))
const adminIds = new Set([...users.values()].filter((user) => user.adminId).map((user) => user.adminId))
const DEMO_MODE = process.env.NODE_ENV !== 'production'
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

app.use(express.json({ limit: '16kb' }))
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

function requestId() {
  return `REQ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

function response(req, res, status, payload) {
  res.status(status).json({ ...payload, requestId: req.requestId })
}

app.use((req, _res, next) => {
  req.requestId = requestId()
  next()
})

function validMobile(mobile) {
  return typeof mobile === 'string' && /^[6-9]\d{9}$/.test(mobile)
}

function hashOtp(challengeId, otp) {
  return crypto.createHmac('sha256', otpSecret).update(`${challengeId}:${otp}`).digest()
}

function compareHash(expected, actual) {
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function createUniqueId(used) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const digits = `${crypto.randomInt(1, 10)}${crypto.randomInt(0, 1_000_000_000_000).toString().padStart(12, '0')}`.slice(0, 12)
    if (!used.has(digits)) {
      used.add(digits)
      return digits
    }
  }
  throw new Error('Could not allocate a unique account identifier')
}

function addAudit(action, mobile, role = 'UNKNOWN') {
  auditEvents.unshift({ id: reqId(), action, role, maskedMobile: `******${mobile.slice(-4)}`, createdAt: new Date().toISOString() })
  if (auditEvents.length > 500) auditEvents.pop()
}

function reqId() {
  return `AUTH-${crypto.randomBytes(5).toString('hex').toUpperCase()}`
}

function newSession(res, user) {
  const token = crypto.randomBytes(32).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = Date.now() + SESSION_TTL_MS
  sessions.set(tokenHash, { user, expiresAt })
  res.cookie('mahasetu_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
  return new Date(expiresAt).toISOString()
}

function readSession(req) {
  const token = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('mahasetu_session='))?.slice('mahasetu_session='.length)
  if (!token) return null
  const tokenHash = crypto.createHash('sha256').update(decodeURIComponent(token)).digest('hex')
  const session = sessions.get(tokenHash)
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(tokenHash)
    return null
  }
  return { tokenHash, ...session }
}

function sessionRequired(req, res, next) {
  const session = readSession(req)
  if (!session) return response(req, res, 401, { success: false, error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' } })
  req.auth = session
  next()
}

app.post('/api/v1/auth/request-otp', (req, res) => {
  if (!DEMO_MODE) return response(req, res, 503, { success: false, error: { code: 'SMS_PROVIDER_NOT_CONFIGURED', message: 'Mobile verification is unavailable because no SMS provider is configured.' } })
  const mobile = req.body?.mobileNumber
  if (!validMobile(mobile)) return response(req, res, 400, { success: false, error: { code: 'INVALID_MOBILE', message: 'Enter a valid 10-digit Indian mobile number.' } })

  const now = Date.now()
  const recent = (requestWindows.get(mobile) ?? []).filter((time) => now - time < 15 * 60 * 1000)
  if (recent.length >= 5) return response(req, res, 429, { success: false, error: { code: 'OTP_RATE_LIMITED', message: 'Too many OTP requests. Please try again later.' } })
  const lastSent = recent.at(-1)
  if (lastSent && now - lastSent < OTP_COOLDOWN_MS) {
    return response(req, res, 429, { success: false, retryAfter: Math.ceil((OTP_COOLDOWN_MS - (now - lastSent)) / 1000), error: { code: 'RESEND_COOLDOWN', message: 'Please wait before requesting another OTP.' } })
  }
  requestWindows.set(mobile, [...recent, now])
  for (const challenge of challenges.values()) if (challenge.mobileNumber === mobile && !challenge.consumed) challenge.consumed = true

  const challengeId = `OTP-CH-${crypto.randomBytes(5).toString('hex').toUpperCase()}`
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  challenges.set(challengeId, { mobileNumber: mobile, otpHash: hashOtp(challengeId, otp), expiresAt: now + OTP_TTL_MS, attempts: 0, verified: false, consumed: false, createdAt: now })
  if (DEMO_MODE) demoSms.set(challengeId, { otp, expiresAt: now + OTP_TTL_MS })
  addAudit('OTP_REQUESTED', mobile)
  response(req, res, 200, { success: true, data: { challengeId, expiresIn: 300, resendIn: 30, maskedMobile: `******${mobile.slice(-4)}` }, message: 'If this mobile number is eligible for MahaSetu authentication, an OTP has been sent.' })
})

app.post('/api/v1/auth/verify-otp', (req, res) => {
  const { challengeId, otp } = req.body ?? {}
  const challenge = challenges.get(challengeId)
  if (!challenge || challenge.consumed || challenge.verified) return response(req, res, 400, { success: false, error: { code: 'INVALID_CHALLENGE', message: 'This verification request is no longer valid. Request a new OTP.' } })
  if (challenge.expiresAt <= Date.now()) return response(req, res, 400, { success: false, error: { code: 'OTP_EXPIRED', message: 'This OTP has expired. Please request a new OTP.' } })
  if (challenge.attempts >= MAX_ATTEMPTS) return response(req, res, 429, { success: false, error: { code: 'OTP_LOCKED', message: 'OTP verification temporarily locked. Please request a new OTP after the cooldown period.' } })
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp) || !compareHash(challenge.otpHash, hashOtp(challengeId, otp))) {
    challenge.attempts += 1
    addAudit('OTP_REJECTED', challenge.mobileNumber)
    const locked = challenge.attempts >= MAX_ATTEMPTS
    return response(req, res, locked ? 429 : 400, { success: false, error: { code: locked ? 'OTP_LOCKED' : 'INVALID_OTP', message: locked ? 'OTP verification temporarily locked. Please request a new OTP after the cooldown period.' : 'The OTP entered is incorrect.' } })
  }
  challenge.verified = true
  challenge.verifiedAt = Date.now()
  demoSms.delete(challengeId)
  addAudit('OTP_VERIFIED', challenge.mobileNumber)
  const user = users.get(challenge.mobileNumber)
  if (!user) return response(req, res, 200, { success: true, data: { accountFound: false, challengeId, mobileNumber: challenge.mobileNumber }, message: 'Mobile number verified.' })
  challenge.consumed = true
  const expiresAt = newSession(res, user)
  user.lastLoginAt = new Date().toISOString()
  addAudit('LOGIN_SUCCESS', user.mobileNumber, user.role)
  return response(req, res, 200, { success: true, data: { accountFound: true, user: publicUser(user), session: { expiresAt } }, message: 'Login successful.' })
})

function publicUser(user) {
  return { id: user.id, role: user.role, citizenId: user.citizenId, adminId: user.adminId, fullName: user.fullName, maskedMobile: `******${user.mobileNumber.slice(-4)}` }
}

function verifiedChallenge(req, res) {
  const { challengeId, mobileNumber } = req.body ?? {}
  const challenge = challenges.get(challengeId)
  if (!challenge || !challenge.verified || challenge.consumed || challenge.expiresAt <= Date.now() || challenge.mobileNumber !== mobileNumber) {
    response(req, res, 400, { success: false, error: { code: 'VERIFICATION_REQUIRED', message: 'Verify your mobile number before creating an account.' } })
    return null
  }
  if (users.has(challenge.mobileNumber)) {
    response(req, res, 409, { success: false, error: { code: 'ACCOUNT_EXISTS', message: 'This verified mobile number already has an account. Please sign in.' } })
    return null
  }
  return challenge
}

app.post('/api/v1/auth/register/citizen', (req, res) => {
  const challenge = verifiedChallenge(req, res)
  if (!challenge) return
  const { fullName, dateOfBirth, gender, state, district, address, email } = req.body ?? {}
  if (![fullName, dateOfBirth, gender, state, district, address].every((value) => typeof value === 'string' && value.trim()) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return response(req, res, 400, { success: false, error: { code: 'INVALID_PROFILE', message: 'Complete all required profile fields with valid values.' } })
  }
  const citizenId = createUniqueId(citizenIds)
  const user = { id: `USR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`, role: 'CITIZEN', citizenId, fullName: fullName.trim(), mobileNumber: challenge.mobileNumber, profile: { dateOfBirth, gender, state, district, address, email: email || '' }, lastLoginAt: new Date().toISOString() }
  users.set(user.mobileNumber, user)
  challenge.consumed = true
  const expiresAt = newSession(res, user)
  addAudit('CITIZEN_REGISTERED', user.mobileNumber, user.role)
  return response(req, res, 201, { success: true, data: { user: publicUser(user), session: { expiresAt } }, message: 'Registration successful.' })
})

app.post('/api/v1/auth/register/admin', (req, res) => {
  const challenge = verifiedChallenge(req, res)
  if (!challenge) return
  const { invitationCode, fullName, email } = req.body ?? {}
  if (!process.env.MAHASETU_ADMIN_INVITE_CODE || invitationCode !== process.env.MAHASETU_ADMIN_INVITE_CODE) return response(req, res, 403, { success: false, error: { code: 'INVITATION_INVALID', message: 'The admin invitation could not be validated.' } })
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response(req, res, 400, { success: false, error: { code: 'INVALID_PROFILE', message: 'Enter a full name and valid email address.' } })
  const user = { id: `USR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`, role: 'ADMIN', adminId: createUniqueId(adminIds), fullName: fullName.trim(), email, mobileNumber: challenge.mobileNumber, lastLoginAt: new Date().toISOString() }
  users.set(user.mobileNumber, user)
  challenge.consumed = true
  const expiresAt = newSession(res, user)
  addAudit('ADMIN_REGISTERED', user.mobileNumber, user.role)
  return response(req, res, 201, { success: true, data: { user: publicUser(user), session: { expiresAt } }, message: 'Admin account created.' })
})

app.get('/api/v1/auth/me', sessionRequired, (req, res) => response(req, res, 200, { success: true, data: { user: publicUser(req.auth.user), session: { expiresAt: new Date(req.auth.expiresAt).toISOString() } } }))

app.post('/api/v1/auth/refresh', sessionRequired, (req, res) => {
  sessions.delete(req.auth.tokenHash)
  const expiresAt = newSession(res, req.auth.user)
  return response(req, res, 200, { success: true, data: { user: publicUser(req.auth.user), session: { expiresAt } } })
})

app.post('/api/v1/auth/logout', (req, res) => {
  const session = readSession(req)
  if (session) {
    sessions.delete(session.tokenHash)
    addAudit('LOGOUT', session.user.mobileNumber, session.user.role)
  }
  res.clearCookie('mahasetu_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' })
  return response(req, res, 200, { success: true, message: 'Logged out.' })
})

app.get('/api/v1/demo/sms/:challengeId', (req, res) => {
  if (!DEMO_MODE) return response(req, res, 404, { success: false, error: { code: 'NOT_FOUND', message: 'Not found.' } })
  const message = demoSms.get(req.params.challengeId)
  const challenge = challenges.get(req.params.challengeId)
  if (!message || !challenge || message.expiresAt <= Date.now() || challenge.consumed) return response(req, res, 404, { success: false, error: { code: 'DEMO_MESSAGE_UNAVAILABLE', message: 'No demo SMS is available. Request a new OTP.' } })
  return response(req, res, 200, { success: true, data: { otp: message.otp, maskedMobile: `******${challenge.mobileNumber.slice(-4)}`, demoOnly: true } })
})

app.get('/api/v1/admin/audit', sessionRequired, (req, res) => {
  if (req.auth.user.role !== 'ADMIN') return response(req, res, 403, { success: false, error: { code: 'FORBIDDEN', message: 'Admin access is required.' } })
  return response(req, res, 200, { success: true, data: { events: auditEvents.slice(0, 100) } })
})

app.listen(port, '127.0.0.1', () => console.log(`MahaSetu local auth API listening on http://127.0.0.1:${port} (${DEMO_MODE ? 'demo mode' : 'production mode'})`))
