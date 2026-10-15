import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { api } from '../api/client'
import type { AccountResultModel, RegisterModel, RegistrationResultModel, TokenModel } from '../api/types'
import { initialAttributeValues, type AttributeValues } from '../components/AttributeInputs'
import CustomerFields, { initialConsents, UsernameCheck } from '../components/CustomerFields'
import { ErrorMessage, Field, Loading, Notice, QueryView } from '../components/ui'
import { useSession } from '../session'

/* ---------- login ---------- */

export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnUrl = params.get('returnUrl') || '/'
  const form = useQuery({ queryKey: ['register-form'], queryFn: () => api.get<RegisterModel>('/account/register'), retry: false })
  const usernames = form.data?.usernamesEnabled ?? false
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post<TokenModel>('/auth/login', usernames ? { username: login, password } : { email: login, password }),
    onSuccess: token => {
      session.signIn(token)
      navigate(returnUrl)
    },
  })

  return (
    <div className="auth-grid">
      <form className="card" onSubmit={e => { e.preventDefault(); submit.mutate() }}>
        <h1>Anmelden</h1>
        <Field label={usernames ? 'Benutzername' : 'E-Mail'} required>
          <input type={usernames ? 'text' : 'email'} required autoComplete="username" value={login} onChange={e => setLogin(e.target.value)} />
        </Field>
        <Field label="Passwort" required>
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
        <ErrorMessage error={submit.error} />
        <button className="primary" disabled={submit.isPending}>Anmelden</button>
        <p className="small"><Link to="/passwordrecovery">Passwort vergessen?</Link></p>
      </form>
      <div className="card">
        <h2>Neukunde?</h2>
        <p>Mit einem Kundenkonto können Sie schneller bestellen und Ihre Bestellungen verfolgen.</p>
        <Link className="button" to="/register">Registrieren</Link>
        {params.get('checkout') && (
          <>
            <h2>Als Gast bestellen</h2>
            <Link className="button" to="/checkout?guest=1">Als Gast fortfahren</Link>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- registration ---------- */

function RegisterForm({ model }: { model: RegisterModel }) {
  const session = useSession()
  const navigate = useNavigate()
  const [value, setValue] = useState(model)
  const [attributes, setAttributes] = useState<AttributeValues>(() => ({
    ...initialAttributeValues(model.customerAttributes, 'customer_attribute_'),
    ...initialConsents(model),
  }))
  const [privacy, setPrivacy] = useState(false)

  const submit = useMutation({
    mutationFn: () => {
      const { availableCountries: _c, availableStates: _s, availableTimeZones: _t, customerAttributes: _a, gdprConsents: _g, ...fields } = value
      return api.post<RegistrationResultModel>('/account/register', { ...fields, acceptPrivacyPolicyEnabled: model.acceptPrivacyPolicyEnabled, attributes })
    },
    onSuccess: result => {
      if (result.token) session.signIn(result.token)
      navigate('/registerresult', { state: result })
    },
  })

  return (
    <form className="card" onSubmit={e => { e.preventDefault(); submit.mutate() }}>
      <CustomerFields value={value} onChange={setValue} attributes={attributes} onAttributesChange={setAttributes}>
        <Field label="E-Mail" required>
          <input type="email" required value={value.email ?? ''} onChange={e => setValue({ ...value, email: e.target.value })} />
        </Field>
        {model.enteringEmailTwice && (
          <Field label="E-Mail bestätigen" required>
            <input type="email" required value={value.confirmEmail ?? ''} onChange={e => setValue({ ...value, confirmEmail: e.target.value })} />
          </Field>
        )}
        {model.usernamesEnabled && (
          <Field label="Benutzername" required hint={model.checkUsernameAvailabilityEnabled && <UsernameCheck username={value.username} />}>
            <input required value={value.username ?? ''} onChange={e => setValue({ ...value, username: e.target.value })} />
          </Field>
        )}
      </CustomerFields>

      <fieldset>
        <legend>Passwort</legend>
        <div className="form-grid">
          <Field label="Passwort" required>
            <input type="password" required autoComplete="new-password" value={value.password ?? ''} onChange={e => setValue({ ...value, password: e.target.value })} />
          </Field>
          <Field label="Passwort bestätigen" required>
            <input type="password" required autoComplete="new-password" value={value.confirmPassword ?? ''} onChange={e => setValue({ ...value, confirmPassword: e.target.value })} />
          </Field>
        </div>
      </fieldset>

      {model.acceptPrivacyPolicyEnabled && (
        <label className="option">
          <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} required /> Ich habe die{' '}
          <Link to="/privacy-notice" target="_blank">Datenschutzerklärung</Link> gelesen
        </label>
      )}
      <ErrorMessage error={submit.error} />
      <button className="primary" disabled={submit.isPending}>Registrieren</button>
    </form>
  )
}

export function RegisterPage() {
  const session = useSession()
  const form = useQuery({ queryKey: ['register-form'], queryFn: () => api.get<RegisterModel>('/account/register') })
  if (session.isRegistered) return <Notice>Sie sind bereits angemeldet. <Link to="/customer/info">Zum Kundenkonto</Link></Notice>
  return (
    <>
      <h1>Registrieren</h1>
      <QueryView query={form}>{model => <RegisterForm model={model} />}</QueryView>
    </>
  )
}

export function RegisterResultPage() {
  const navigateState = (useLocation().state ?? null) as RegistrationResultModel | null
  return (
    <div className="card narrow">
      <h1>Registrierung</h1>
      <Notice kind="success">{navigateState?.message ?? 'Die Registrierung wurde abgeschlossen.'}</Notice>
      {navigateState && <p className="small muted">Registrierungsart: {navigateState.registrationType}</p>}
      <Link className="button" to="/">Weiter einkaufen</Link>
    </div>
  )
}

/* ---------- password recovery ---------- */

export function PasswordRecoveryPage() {
  const [email, setEmail] = useState('')
  const submit = useMutation({ mutationFn: () => api.post('/account/password-recovery', { email }) })
  return (
    <form className="card narrow" onSubmit={e => { e.preventDefault(); submit.mutate() }}>
      <h1>Passwort vergessen</h1>
      {submit.isSuccess ? (
        <Notice kind="success">Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail mit einem Link zum Zurücksetzen gesendet.</Notice>
      ) : (
        <>
          <Field label="E-Mail" required><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <ErrorMessage error={submit.error} />
          <button className="primary" disabled={submit.isPending}>Link anfordern</button>
        </>
      )}
    </form>
  )
}

/** Values of an email link (token, guid, email), see API.md "Frontend-Seiten für E-Mail-Links" */
function useLinkValues() {
  const [params] = useSearchParams()
  return { token: params.get('token') ?? '', guid: params.get('guid') ?? undefined, email: params.get('email') ?? undefined }
}

export function PasswordRecoveryConfirmPage() {
  const session = useSession()
  const link = useLinkValues()
  const check = useQuery({
    queryKey: ['password-recovery-check', link],
    queryFn: () => api.post<{ disablePasswordChanging?: boolean; result?: string | null }>('/account/password-recovery/check', link),
    retry: false,
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirm] = useState('')
  const submit = useMutation({
    mutationFn: () => api.post<AccountResultModel>('/account/password-recovery/confirm', { ...link, newPassword, confirmNewPassword }),
    onSuccess: result => result.token && session.signIn(result.token),
  })

  return (
    <div className="card narrow">
      <h1>Neues Passwort</h1>
      {check.isPending && <Loading />}
      <ErrorMessage error={check.error} />
      {check.data?.result && <Notice kind="warning">{check.data.result}</Notice>}
      {submit.data ? (
        <Notice kind="success">{submit.data.message} <Link to="/customer/info">Zum Kundenkonto</Link></Notice>
      ) : (
        check.data &&
        !check.data.disablePasswordChanging && (
          <form onSubmit={e => { e.preventDefault(); submit.mutate() }}>
            <Field label="Neues Passwort" required><input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} /></Field>
            <Field label="Passwort bestätigen" required><input type="password" required value={confirmNewPassword} onChange={e => setConfirm(e.target.value)} /></Field>
            <ErrorMessage error={submit.error} />
            <button className="primary" disabled={submit.isPending}>Passwort ändern</button>
          </form>
        )
      )}
    </div>
  )
}

/** Pages of email links that call one endpoint on load (account activation, email revalidation, newsletter activation). */
function LinkActionPage({ title, run }: { title: string; run: () => Promise<{ message?: string; result?: string; token?: TokenModel | null }> }) {
  const session = useSession()
  const action = useMutation({
    mutationFn: run,
    onSuccess: result => result.token && session.signIn(result.token),
  })
  // run once, also in StrictMode
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    action.mutate()
  }, [action])

  return (
    <div className="card narrow">
      <h1>{title}</h1>
      {action.isPending && <Loading />}
      <ErrorMessage error={action.error} />
      {action.data && <Notice kind="success">{action.data.message ?? action.data.result ?? 'Erledigt.'}</Notice>}
      <Link to="/">Zur Startseite</Link>
    </div>
  )
}

export function AccountActivationPage() {
  const link = useLinkValues()
  return <LinkActionPage title="Kontoaktivierung" run={() => api.post<AccountResultModel>('/account/activation', link)} />
}

export function EmailRevalidationPage() {
  const link = useLinkValues()
  return <LinkActionPage title="E-Mail-Bestätigung" run={() => api.post<AccountResultModel>('/account/email-revalidation', link)} />
}

export function NewsletterActivationPage() {
  const [params] = useSearchParams()
  return (
    <LinkActionPage
      title="Newsletter"
      run={() => api.post<{ result: string }>('/newsletter/activation', { token: params.get('token'), active: params.get('active') === 'true' })}
    />
  )
}
