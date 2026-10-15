import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { api } from '../api/client'
import { useCartChanged, useLayout } from '../api/hooks'
import type {
  AddressModel,
  CustomerAddressListModel,
  CustomerBackInStockSubscriptionsModel,
  CustomerDownloadableProductsModel,
  CustomerInfoModel,
  CustomerNavigationModel,
  CustomerOrderListModel,
  CustomerProductReviewsModel,
  CustomerRecurringPaymentListModel,
  CustomerReturnRequestsModel,
  CustomerRewardPointsModel,
  OrderDetailsModel,
  PlaceOrderResultModel,
  ReorderResultModel,
  ShipmentDetailsModel,
  TokenModel,
  VendorFormModel,
} from '../api/types'
import AddressForm, { AddressBlock } from '../components/AddressForm'
import AttributeInputs, { initialAttributeValues, type AttributeValues } from '../components/AttributeInputs'
import CustomerFields, { initialConsents, UsernameCheck } from '../components/CustomerFields'
import { useToast } from '../components/Toast'
import { ErrorMessage, Field, formatDate, Html, Img, Notice, Pager, QueryView, Rating } from '../components/ui'
import { useSession } from '../session'

/* ---------- layout ---------- */

/** routeName of the storefront customer navigation → route of this frontend */
const ACCOUNT_ROUTES: Record<string, string> = {
  CustomerInfo: '/customer/info',
  CustomerAddresses: '/customer/addresses',
  CustomerOrders: '/order/history',
  CustomerRecurringPayments: '/recurringpayment/history',
  CustomerReturnRequests: '/returnrequest/history',
  CustomerDownloadableProducts: '/customer/downloadableproducts',
  CustomerBackInStockSubscriptions: '/backinstocksubscriptions/manage',
  CustomerRewardPoints: '/rewardpoints/history',
  CustomerChangePassword: '/customer/changepassword',
  CustomerAvatar: '/customer/avatar',
  CustomerProductReviews: '/customer/productreviews',
  CustomerVendorInfo: '/customer/vendorinfo',
  GdprTools: '/customer/gdpr',
  CheckGiftCardBalance: '/customer/checkgiftcardbalance',
}

export function AccountLayout() {
  const session = useSession()
  const location = useLocation()
  const layout = useLayout()
  const nav = useQuery({
    queryKey: ['account-navigation'],
    queryFn: () => api.get<CustomerNavigationModel>('/account/navigation'),
    enabled: session.isRegistered,
  })

  if (!session.isRegistered) return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />

  return (
    <div className="with-side">
      <aside className="side">
        <div className="block">
          <h4>Mein Konto</h4>
          <ul className="account-nav">
            {nav.data?.customerNavigationItems.map(item => {
              const to = ACCOUNT_ROUTES[item.routeName]
              return <li key={item.routeName}>{to ? <NavLink to={to}>{item.title}</NavLink> : <span className="muted" title={item.routeName}>{item.title}</span>}</li>
            })}
            {layout.data?.headerLinks.allowPrivateMessages && <li><NavLink to="/privatemessages">Private Nachrichten</NavLink></li>}
            <li><NavLink to="/vendor/apply">Händlerkonto beantragen</NavLink></li>
          </ul>
        </div>
      </aside>
      <div>
        <ErrorMessage error={nav.error} />
        <Outlet />
      </div>
    </div>
  )
}

/* ---------- customer info ---------- */

function InfoForm({ model }: { model: CustomerInfoModel }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [value, setValue] = useState(model)
  const [attributes, setAttributes] = useState<AttributeValues>(() => ({
    ...initialAttributeValues(model.customerAttributes, 'customer_attribute_'),
    ...initialConsents(model),
  }))
  const save = useMutation({
    mutationFn: () => {
      const { availableCountries: _c, availableStates: _s, availableTimeZones: _t, customerAttributes: _a, gdprConsents: _g, ...fields } = value
      return api.put<CustomerInfoModel>('/account/info', { ...fields, attributes })
    },
    onSuccess: result => {
      queryClient.setQueryData(['account-info'], result)
      void queryClient.invalidateQueries({ queryKey: ['layout'] })
      void queryClient.invalidateQueries({ queryKey: ['context'] })
      toast('Gespeichert')
    },
  })

  return (
    <form className="card" onSubmit={e => { e.preventDefault(); save.mutate() }}>
      {model.emailToRevalidate && <Notice kind="warning">Die neue E-Mail-Adresse {model.emailToRevalidate} muss noch bestätigt werden.</Notice>}
      <CustomerFields value={value} onChange={setValue} attributes={attributes} onAttributesChange={setAttributes}>
        <Field label="E-Mail" required>
          <input type="email" required value={value.email ?? ''} onChange={e => setValue({ ...value, email: e.target.value })} />
        </Field>
        {model.usernamesEnabled && (
          <Field label="Benutzername" hint={model.checkUsernameAvailabilityEnabled && value.username !== model.username && <UsernameCheck username={value.username} />}>
            <input value={value.username ?? ''} disabled={!model.allowUsersToChangeUsernames} onChange={e => setValue({ ...value, username: e.target.value })} />
          </Field>
        )}
      </CustomerFields>
      {model.vatNumberStatusNote && <p className="small muted">USt-IdNr.-Status: {model.vatNumberStatusNote}</p>}
      <ErrorMessage error={save.error} />
      <button className="primary" disabled={save.isPending}>Speichern</button>
    </form>
  )
}

export function CustomerInfoPage() {
  const info = useQuery({ queryKey: ['account-info'], queryFn: () => api.get<CustomerInfoModel>('/account/info') })
  return (
    <>
      <h1>Kundeninformationen</h1>
      <QueryView query={info}>{model => <InfoForm key={JSON.stringify(model).length} model={model} />}</QueryView>
    </>
  )
}

/* ---------- addresses ---------- */

/** The address list contains no empty form, so a new address copies the field settings of an existing one. */
function newAddressTemplate(existing?: AddressModel): AddressModel {
  const flags = existing ?? {
    companyEnabled: true, companyRequired: false, countryEnabled: true, stateProvinceEnabled: true, countyEnabled: false, countyRequired: false,
    cityEnabled: true, cityRequired: true, streetAddressEnabled: true, streetAddressRequired: true, streetAddress2Enabled: true, streetAddress2Required: false,
    zipPostalCodeEnabled: true, zipPostalCodeRequired: true, phoneEnabled: true, phoneRequired: true, faxEnabled: false, faxRequired: false,
    customAddressAttributes: [],
  }
  return {
    ...(flags as AddressModel),
    id: 0, firstName: '', lastName: '', email: '', company: '', countryId: null, countryName: null, stateProvinceId: null, stateProvinceName: null,
    county: '', city: '', address1: '', address2: '', zipPostalCode: '', phoneNumber: '', faxNumber: '',
    availableCountries: [], availableStates: [], formattedCustomAddressAttributes: null,
    customAddressAttributes: (flags.customAddressAttributes ?? []).map(a => ({ ...a, values: a.values.map(v => ({ ...v, isPreSelected: false })), defaultValue: null })),
  }
}

function AddressEditor({ address, onDone }: { address: AddressModel; onDone: (list?: CustomerAddressListModel) => void }) {
  const [value, setValue] = useState(address)
  const [attributes, setAttributes] = useState(() => initialAttributeValues(address.customAddressAttributes, 'address_attribute_'))
  const save = useMutation({
    mutationFn: () => {
      const body = { ...value, attributes }
      return address.id ? api.put<CustomerAddressListModel>(`/account/addresses/${address.id}`, body) : api.post<CustomerAddressListModel>('/account/addresses', body)
    },
    onSuccess: onDone,
  })
  return (
    <form className="card" onSubmit={e => { e.preventDefault(); save.mutate() }}>
      <h3>{address.id ? 'Adresse bearbeiten' : 'Neue Adresse'}</h3>
      <AddressForm value={value} onChange={setValue} attributes={attributes} onAttributesChange={setAttributes} />
      <ErrorMessage error={save.error} />
      <div className="row">
        <button className="primary" disabled={save.isPending}>Speichern</button>
        <button type="button" onClick={() => onDone()}>Abbrechen</button>
      </div>
    </form>
  )
}

export function AddressesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const list = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<CustomerAddressListModel>('/account/addresses') })
  const [editing, setEditing] = useState<AddressModel | null>(null)
  const remove = useMutation({
    mutationFn: (id: number) => api.delete<CustomerAddressListModel>(`/account/addresses/${id}`),
    onSuccess: result => queryClient.setQueryData(['addresses'], result),
    onError: error => toast(error.message, 'error'),
  })

  return (
    <>
      <div className="row space-between">
        <h1>Adressen</h1>
        {!editing && <button onClick={() => setEditing(newAddressTemplate(list.data?.addresses[0]))}>Neue Adresse</button>}
      </div>
      {editing && (
        <AddressEditor
          key={editing.id}
          address={editing}
          onDone={result => {
            if (result) queryClient.setQueryData(['addresses'], result)
            setEditing(null)
          }}
        />
      )}
      <QueryView query={list}>
        {l =>
          l.addresses.length === 0 ? (
            <Notice>Keine Adressen gespeichert.</Notice>
          ) : (
            <div className="address-grid">
              {l.addresses.map(a => (
                <div key={a.id} className="card">
                  <AddressBlock address={a} />
                  <div className="row">
                    <button className="link" onClick={() => setEditing(a)}>Bearbeiten</button>
                    <button className="link danger" onClick={() => confirm('Adresse löschen?') && remove.mutate(a.id)}>Löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </QueryView>
    </>
  )
}

/* ---------- orders ---------- */

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const period = params.get('period') ?? ''
  const orders = useQuery({
    queryKey: ['orders', page, period],
    queryFn: () => api.get<CustomerOrderListModel & { pagerModel?: never }>('/account/orders', { page, period }),
  })
  return (
    <>
      <div className="row space-between">
        <h1>Bestellungen</h1>
        <select value={period} onChange={e => setParams({ period: e.target.value })}>
          <option value="">Alle</option>
          <option value="Day">Heute</option>
          <option value="Week">Letzte Woche</option>
          <option value="Month">Letzter Monat</option>
          <option value="HalfYear">Letztes halbes Jahr</option>
          <option value="Year">Letztes Jahr</option>
        </select>
      </div>
      <QueryView query={orders}>
        {o =>
          o.orders.length === 0 ? (
            <Notice>Keine Bestellungen vorhanden.</Notice>
          ) : (
            <table className="table">
              <thead><tr><th>Nr.</th><th>Datum</th><th>Status</th><th>Zahlung</th><th>Versand</th><th>Summe</th><th /></tr></thead>
              <tbody>
                {o.orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.customOrderNumber}</td>
                    <td>{formatDate(order.createdOn)}</td>
                    <td>{order.orderStatus}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.shippingStatus}</td>
                    <td>{order.orderTotal}</td>
                    <td className="actions">
                      <Link to={`/account/orders/${order.id}`}>Details</Link>
                      {order.isReturnRequestAllowed && <Link to={`/returnrequest/${order.id}`}>Retoure</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </QueryView>
    </>
  )
}

export function OrderDetailsPage() {
  const id = Number(useParams().orderId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const cartChanged = useCartChanged()
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.get<OrderDetailsModel>(`/account/orders/${id}`) })
  const onError = (error: Error) => toast(error.message, 'error')

  const reorder = useMutation({
    mutationFn: () => api.post<ReorderResultModel>(`/account/orders/${id}/reorder`),
    onSuccess: result => {
      cartChanged()
      if (result.message) toast(result.message, 'error')
      navigate('/cart')
    },
    onError,
  })
  const cancel = useMutation({
    mutationFn: () => api.post<OrderDetailsModel>(`/account/orders/${id}/cancel`),
    onSuccess: result => queryClient.setQueryData(['order', id], result),
    onError,
  })
  const repost = useMutation({
    mutationFn: () => api.post<PlaceOrderResultModel>(`/checkout/orders/${id}/repost-payment`),
    onSuccess: result => {
      if (result.paymentRedirectUrl) window.location.href = result.paymentRedirectUrl
      else void queryClient.invalidateQueries({ queryKey: ['order', id] })
    },
    onError,
  })
  const download = (path: string, query?: Record<string, string | boolean>) => void api.download(path, query).catch(onError)

  return (
    <QueryView query={order}>
      {o => (
        <>
          <div className="row space-between wrap">
            <h1>Bestellung {o.customOrderNumber}</h1>
            <div className="row wrap">
              {!o.pdfInvoiceDisabled && <button onClick={() => download(`/account/orders/${id}/pdf`)}>PDF-Rechnung</button>}
              {o.isReOrderAllowed && <button onClick={() => reorder.mutate()}>Erneut bestellen</button>}
              {o.isReturnRequestAllowed && <Link className="button" to={`/returnrequest/${id}`}>Retoure</Link>}
              {o.canRePostProcessPayment && <button onClick={() => repost.mutate()}>Zahlung wiederholen</button>}
              <button className="danger" onClick={() => confirm('Bestellung stornieren?') && cancel.mutate()}>Stornieren</button>
            </div>
          </div>
          <dl className="kv">
            <dt>Datum</dt><dd>{formatDate(o.createdOn)}</dd>
            <dt>Status</dt><dd>{o.orderStatus}</dd>
            <dt>Zahlung</dt><dd>{o.paymentMethod} – {o.paymentMethodStatus}</dd>
            {o.isShippable && <><dt>Versand</dt><dd>{o.shippingMethod} – {o.shippingStatus}</dd></>}
            <dt>Gesamt</dt><dd><strong>{o.orderTotal}</strong></dd>
          </dl>
          <div className="review-grid">
            <AddressBlock title="Rechnungsadresse" address={o.billingAddress} />
            {o.isShippable && (o.pickupInStore ? <AddressBlock title="Abholung" address={o.pickupAddress} /> : <AddressBlock title="Lieferadresse" address={o.shippingAddress} />)}
          </div>
          {o.shipments.length > 0 && (
            <>
              <h3>Sendungen</h3>
              <table className="table">
                <thead><tr><th>Sendung</th><th>Tracking</th><th>Versendet</th><th>Zugestellt</th></tr></thead>
                <tbody>
                  {o.shipments.map(s => (
                    <tr key={s.id}>
                      <td><Link to={`/account/shipments/${s.id}`}>#{s.id}</Link></td>
                      <td>{s.trackingNumber}</td>
                      <td>{formatDate(s.shippedDate)}</td>
                      <td>{formatDate(s.deliveryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <h3>Artikel</h3>
          <table className="table">
            <thead><tr>{o.showSku && <th>Art.-Nr.</th>}<th>Produkt</th><th>Preis</th><th>Menge</th><th>Summe</th><th /></tr></thead>
            <tbody>
              {o.items.map(item => (
                <tr key={item.id}>
                  {o.showSku && <td>{item.sku}</td>}
                  <td><Link to={`/${item.productSeName}`}>{item.productName}</Link><Html html={item.attributeInfo} className="small" /><Html html={item.rentalInfo} className="small" /></td>
                  <td>{item.unitPrice}</td>
                  <td>{item.quantity}</td>
                  <td>{item.subTotal}</td>
                  <td className="actions">
                    {item.downloadId > 0 && <button className="link" onClick={() => download(`/downloads/order-item/${item.orderItemGuid}`, { agree: true })}>Download</button>}
                    {item.licenseId > 0 && <button className="link" onClick={() => download(`/downloads/license/${item.orderItemGuid}`)}>Lizenz</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Html html={o.checkoutAttributeInfo} className="small" />
          <table className="table totals">
            <tbody>
              <tr><td>Zwischensumme</td><td>{o.orderSubtotal}</td></tr>
              {o.orderSubTotalDiscount && <tr><td>Rabatt</td><td>{o.orderSubTotalDiscount}</td></tr>}
              {o.orderShipping && <tr><td>Versand</td><td>{o.orderShipping}</td></tr>}
              {o.paymentMethodAdditionalFee && <tr><td>Zahlungsgebühr</td><td>{o.paymentMethodAdditionalFee}</td></tr>}
              {o.displayTax && o.tax && <tr><td>MwSt.</td><td>{o.tax}</td></tr>}
              {o.orderTotalDiscount && <tr><td>Rabatt</td><td>{o.orderTotalDiscount}</td></tr>}
              {o.giftCards?.map(g => <tr key={g.couponCode}><td>Geschenkkarte {g.couponCode}</td><td>{g.amount}</td></tr>)}
              {!!o.redeemedRewardPoints && <tr><td>{o.redeemedRewardPoints} Bonuspunkte</td><td>{o.redeemedRewardPointsAmount}</td></tr>}
              <tr className="total"><td>Gesamt</td><td>{o.orderTotal}</td></tr>
            </tbody>
          </table>
          {o.orderNotes.length > 0 && (
            <>
              <h3>Notizen</h3>
              {o.orderNotes.map(n => (
                <div key={n.id} className="review">
                  <div className="small muted">{formatDate(n.createdOn)}</div>
                  <Html html={n.note} />
                  {n.hasDownload && <button className="link" onClick={() => download(`/downloads/order-note/${n.id}`)}>Anhang herunterladen</button>}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </QueryView>
  )
}

export function ShipmentPage() {
  const id = Number(useParams().shipmentId)
  const shipment = useQuery({ queryKey: ['shipment', id], queryFn: () => api.get<ShipmentDetailsModel>(`/account/shipments/${id}`) })
  return (
    <QueryView query={shipment}>
      {s => (
        <>
          <h1>Sendung #{s.id}</h1>
          <p>Bestellung: <Link to={`/account/orders/${s.order.id}`}>{s.order.customOrderNumber}</Link></p>
          <dl className="kv">
            <dt>Tracking</dt><dd>{s.trackingNumberUrl ? <a href={s.trackingNumberUrl} target="_blank" rel="noreferrer">{s.trackingNumber}</a> : s.trackingNumber}</dd>
            <dt>Versendet</dt><dd>{formatDate(s.shippedDate) || '–'}</dd>
            <dt>Zugestellt</dt><dd>{formatDate(s.deliveryDate) || '–'}</dd>
          </dl>
          <table className="table">
            <thead><tr><th>Produkt</th><th>Bestellt</th><th>Versendet</th></tr></thead>
            <tbody>
              {s.items.map(i => (
                <tr key={i.id}><td>{i.productName}<Html html={i.attributeInfo} className="small" /></td><td>{i.quantityOrdered}</td><td>{i.quantityShipped}</td></tr>
              ))}
            </tbody>
          </table>
          {s.shipmentStatusEvents && s.shipmentStatusEvents.length > 0 && (
            <ul>{s.shipmentStatusEvents.map((e, i) => <li key={i}>{formatDate(e.date)} – {e.eventName} {e.location}</li>)}</ul>
          )}
        </>
      )}
    </QueryView>
  )
}

/* ---------- return requests ---------- */

export function ReturnRequestHistoryPage() {
  const list = useQuery({ queryKey: ['return-requests'], queryFn: () => api.get<CustomerReturnRequestsModel>('/account/return-requests') })
  return (
    <>
      <h1>Retouren</h1>
      <QueryView query={list}>
        {l =>
          l.items.length === 0 ? (
            <Notice>Keine Retouren vorhanden.</Notice>
          ) : (
            l.items.map(r => (
              <div key={r.id} className="card">
                <strong>Retoure {r.customNumber}</strong> – {r.returnRequestStatus}
                <div><Link to={`/${r.productSeName}`}>{r.productName}</Link> × {r.quantity}</div>
                <div className="small">Grund: {r.returnReason} · Gewünscht: {r.returnAction} · {formatDate(r.createdOn)}</div>
                {r.comments && <p className="small">{r.comments}</p>}
              </div>
            ))
          )
        }
      </QueryView>
    </>
  )
}

export function ReturnRequestPage() {
  const orderId = Number(useParams().orderId)
  const [params] = useSearchParams()
  const token = params.get('token') ?? undefined
  const form = useQuery({
    queryKey: ['return-request-form', orderId, token],
    queryFn: () => api.get<import('../api/types').SubmitReturnRequestModel>(`/account/orders/${orderId}/return-request`, { token }),
  })
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [reason, setReason] = useState(0)
  const [action, setAction] = useState(0)
  const [comments, setComments] = useState('')
  const [fileGuid, setFileGuid] = useState<string | null>(null)
  const submit = useMutation({
    mutationFn: () =>
      api.post<import('../api/types').SubmitReturnRequestModel>(`/account/orders/${orderId}/return-request`, {
        quantities,
        returnRequestReasonId: reason || form.data?.availableReturnReasons[0]?.id,
        returnRequestActionId: action || form.data?.availableReturnActions[0]?.id,
        comments,
        uploadedFileGuid: fileGuid,
        withdrawalToken: token,
      }),
  })
  const upload = useMutation({
    mutationFn: (file: File) => api.upload<{ downloadGuid: string; message: string }>('/return-requests/upload', file),
    onSuccess: r => setFileGuid(r.downloadGuid),
  })

  return (
    <QueryView query={form}>
      {f => (
        <>
          <h1>Retoure für Bestellung {f.customOrderNumber}</h1>
          {submit.data?.result ? (
            <Notice kind="success">{submit.data.result}</Notice>
          ) : (
            <form className="card" onSubmit={e => { e.preventDefault(); submit.mutate() }}>
              <table className="table">
                <thead><tr><th>Produkt</th><th>Preis</th><th>Menge zurücksenden</th></tr></thead>
                <tbody>
                  {f.items.map(i => (
                    <tr key={i.id}>
                      <td>{i.productName}<Html html={i.attributeInfo} className="small" /></td>
                      <td>{i.unitPrice}</td>
                      <td>
                        <select value={quantities[i.id] ?? 0} onChange={e => setQuantities(q => ({ ...q, [i.id]: +e.target.value }))}>
                          {Array.from({ length: i.quantity + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="form-grid">
                <Field label="Grund">
                  <select value={reason} onChange={e => setReason(+e.target.value)}>
                    {f.availableReturnReasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
                <Field label="Gewünschte Aktion">
                  <select value={action} onChange={e => setAction(+e.target.value)}>
                    {f.availableReturnActions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              </div>
              {f.allowFiles && (
                <Field label="Datei" hint={fileGuid && `Hochgeladen: ${fileGuid}`}>
                  <input type="file" onChange={e => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
                </Field>
              )}
              <Field label="Kommentar"><textarea value={comments} onChange={e => setComments(e.target.value)} /></Field>
              <ErrorMessage error={submit.error ?? upload.error} />
              <button className="primary" disabled={submit.isPending}>Retoure absenden</button>
            </form>
          )}
        </>
      )}
    </QueryView>
  )
}

export function GuestWithdrawalPage() {
  const form = useQuery({ queryKey: ['withdrawal-form'], queryFn: () => api.get<Record<string, unknown>>('/return-requests/find') })
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const submit = useMutation({ mutationFn: () => api.post<{ result?: string }>('/return-requests/find', { orderNumber, email }) })
  return (
    <div className="card narrow">
      <h1>Widerruf für Gastbestellungen</h1>
      <ErrorMessage error={form.error} />
      {submit.data ? (
        <Notice kind="success">{submit.data.result ?? 'Falls die Bestellung existiert, wurde ein Link an die Rechnungs-E-Mail gesendet.'}</Notice>
      ) : (
        form.data && (
          <form onSubmit={e => { e.preventDefault(); submit.mutate() }}>
            <Field label="Bestellnummer" required><input required value={orderNumber} onChange={e => setOrderNumber(e.target.value)} /></Field>
            <Field label="E-Mail der Rechnungsadresse" required><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
            <ErrorMessage error={submit.error} />
            <button className="primary" disabled={submit.isPending}>Link anfordern</button>
          </form>
        )
      )}
    </div>
  )
}

/* ---------- small account pages ---------- */

export function ChangePasswordPage() {
  const session = useSession()
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirmNewPassword, setConfirm] = useState('')
  const save = useMutation({
    mutationFn: () => api.post<TokenModel>('/account/change-password', { oldPassword, newPassword, confirmNewPassword }),
    onSuccess: token => session.signIn(token),
  })
  return (
    <form className="card narrow" onSubmit={e => { e.preventDefault(); save.mutate() }}>
      <h1>Passwort ändern</h1>
      {save.isSuccess && <Notice kind="success">Das Passwort wurde geändert. Andere Geräte wurden abgemeldet.</Notice>}
      <Field label="Altes Passwort" required><input type="password" required value={oldPassword} onChange={e => setOld(e.target.value)} /></Field>
      <Field label="Neues Passwort" required><input type="password" required value={newPassword} onChange={e => setNew(e.target.value)} /></Field>
      <Field label="Neues Passwort bestätigen" required><input type="password" required value={confirmNewPassword} onChange={e => setConfirm(e.target.value)} /></Field>
      <ErrorMessage error={save.error} />
      <button className="primary" disabled={save.isPending}>Ändern</button>
    </form>
  )
}

export function AvatarPage() {
  const queryClient = useQueryClient()
  const avatar = useQuery({ queryKey: ['avatar'], queryFn: () => api.get<{ avatarUrl: string | null }>('/account/avatar') })
  const set = (m: { avatarUrl: string | null }) => queryClient.setQueryData(['avatar'], m)
  const upload = useMutation({ mutationFn: (file: File) => api.upload<{ avatarUrl: string | null }>('/account/avatar', file, 'uploadedFile'), onSuccess: set })
  const remove = useMutation({ mutationFn: () => api.delete<{ avatarUrl: string | null }>('/account/avatar'), onSuccess: set })
  return (
    <>
      <h1>Avatar</h1>
      <QueryView query={avatar}>
        {a => (
          <div className="card row">
            <Img url={a.avatarUrl} className="avatar" />
            <div>
              <input type="file" accept="image/jpeg,image/gif" onChange={e => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
              {a.avatarUrl && <button className="link danger" onClick={() => remove.mutate()}>Entfernen</button>}
              <ErrorMessage error={upload.error ?? remove.error} />
            </div>
          </div>
        )}
      </QueryView>
    </>
  )
}

export function DownloadableProductsPage() {
  const toast = useToast()
  const list = useQuery({ queryKey: ['downloadable'], queryFn: () => api.get<CustomerDownloadableProductsModel>('/account/downloadable-products') })
  const [agreement, setAgreement] = useState<{ guid: string; text: string } | null>(null)

  async function download(guid: string, agree = false) {
    try {
      await api.download(`/downloads/order-item/${guid}`, { agree })
    } catch (error) {
      // 409: the user agreement has to be accepted first
      if ((error as { status?: number }).status === 409) {
        const model = await api.get<{ userAgreementText: string }>(`/account/user-agreement/${guid}`)
        setAgreement({ guid, text: model.userAgreementText })
      } else toast((error as Error).message, 'error')
    }
  }

  return (
    <>
      <h1>Downloads</h1>
      {agreement && (
        <div className="card">
          <h3>Nutzungsvereinbarung</h3>
          <Html html={agreement.text} />
          <button className="primary" onClick={() => { void download(agreement.guid, true); setAgreement(null) }}>Zustimmen und herunterladen</button>
        </div>
      )}
      <QueryView query={list}>
        {l =>
          l.items.length === 0 ? (
            <Notice>Keine herunterladbaren Produkte vorhanden.</Notice>
          ) : (
            <table className="table">
              <thead><tr><th>Bestellung</th><th>Datum</th><th>Produkt</th><th /></tr></thead>
              <tbody>
                {l.items.map(i => (
                  <tr key={i.orderItemGuid}>
                    <td><Link to={`/account/orders/${i.orderId}`}>{i.customOrderNumber}</Link></td>
                    <td>{formatDate(i.createdOn)}</td>
                    <td><Link to={`/${i.productSeName}`}>{i.productName}</Link><Html html={i.productAttributes} className="small" /></td>
                    <td className="actions">
                      {i.downloadId > 0 && <button className="link" onClick={() => void download(i.orderItemGuid)}>Download</button>}
                      {i.licenseId > 0 && <button className="link" onClick={() => void api.download(`/downloads/license/${i.orderItemGuid}`).catch(e => toast(e.message, 'error'))}>Lizenz</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </QueryView>
    </>
  )
}

export function BackInStockSubscriptionsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const list = useQuery({ queryKey: ['back-in-stock-list', page], queryFn: () => api.get<CustomerBackInStockSubscriptionsModel>('/account/back-in-stock-subscriptions', { page }) })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete<CustomerBackInStockSubscriptionsModel>(`/account/back-in-stock-subscriptions/${id}`),
    onSuccess: result => queryClient.setQueryData(['back-in-stock-list', page], result),
  })
  return (
    <>
      <h1>Benachrichtigungen bei Verfügbarkeit</h1>
      <QueryView query={list}>
        {l =>
          l.subscriptions.length === 0 ? (
            <Notice>Keine Benachrichtigungen abonniert.</Notice>
          ) : (
            <>
              <ul>
                {l.subscriptions.map(s => (
                  <li key={s.id}>
                    <Link to={`/${s.seName}`}>{s.productName}</Link> <button className="link danger" onClick={() => remove.mutate(s.id)}>Löschen</button>
                  </li>
                ))}
              </ul>
              <Pager pager={l.pagerModel} onPage={setPage} />
            </>
          )
        }
      </QueryView>
    </>
  )
}

export function RewardPointsPage() {
  const [page, setPage] = useState(1)
  const points = useQuery({ queryKey: ['reward-points', page], queryFn: () => api.get<CustomerRewardPointsModel>('/account/reward-points', { page }) })
  return (
    <>
      <h1>Bonuspunkte</h1>
      <QueryView query={points}>
        {p => (
          <>
            <p>Guthaben: <strong>{p.rewardPointsBalance} Punkte</strong> ({p.rewardPointsAmount})</p>
            {p.minimumRewardPointsBalance ? <p className="small muted">Einlösbar ab {p.minimumRewardPointsBalance} Punkten ({p.minimumRewardPointsAmount})</p> : null}
            <table className="table">
              <thead><tr><th>Datum</th><th>Punkte</th><th>Saldo</th><th>Info</th></tr></thead>
              <tbody>
                {p.rewardPoints.map((r, i) => (
                  <tr key={r.id ?? i}><td>{formatDate(r.createdOn)}</td><td>{r.points}</td><td>{r.pointsBalance}</td><td>{r.message}</td></tr>
                ))}
              </tbody>
            </table>
            <Pager pager={p.pagerModel} onPage={setPage} />
          </>
        )}
      </QueryView>
    </>
  )
}

export function CustomerProductReviewsPage() {
  const [page, setPage] = useState(1)
  const reviews = useQuery({ queryKey: ['my-reviews', page], queryFn: () => api.get<CustomerProductReviewsModel>('/products/reviews/mine', { page }) })
  return (
    <>
      <h1>Meine Bewertungen</h1>
      <QueryView query={reviews}>
        {r =>
          r.productReviews.length === 0 ? (
            <Notice>Noch keine Bewertungen geschrieben.</Notice>
          ) : (
            <>
              {r.productReviews.map((review, i) => (
                <div key={i} className="review">
                  <div className="row space-between">
                    <span><Link to={`/${review.productSeName}`}>{review.productName}</Link>: <strong>{review.title}</strong></span>
                    <Rating value={review.rating} />
                  </div>
                  <p>{review.reviewText}</p>
                  <div className="small muted">{review.writtenOnStr} · {review.approvalStatus}</div>
                </div>
              ))}
              <Pager pager={r.pagerModel} onPage={setPage} />
            </>
          )
        }
      </QueryView>
    </>
  )
}

export function RecurringPaymentsPage() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['recurring'], queryFn: () => api.get<CustomerRecurringPaymentListModel>('/account/recurring-payments') })
  const set = (m: CustomerRecurringPaymentListModel) => queryClient.setQueryData(['recurring'], m)
  const cancel = useMutation({ mutationFn: (id: number) => api.post<CustomerRecurringPaymentListModel>(`/account/recurring-payments/${id}/cancel`), onSuccess: set })
  const retry = useMutation({ mutationFn: (id: number) => api.post<CustomerRecurringPaymentListModel>(`/account/recurring-payments/${id}/retry`), onSuccess: set })
  return (
    <>
      <h1>Abonnements</h1>
      <ErrorMessage error={cancel.error ?? retry.error} />
      <QueryView query={list}>
        {l => (
          <>
            {l.recurringPaymentErrors.map((e, i) => <Notice key={i} kind="error">{e}</Notice>)}
            {l.recurringPayments.length === 0 ? (
              <Notice>Keine Abonnements vorhanden.</Notice>
            ) : (
              <table className="table">
                <thead><tr><th>Start</th><th>Zyklus</th><th>Nächste Zahlung</th><th>Verbleibend</th><th>Erstbestellung</th><th /></tr></thead>
                <tbody>
                  {l.recurringPayments.map(r => (
                    <tr key={r.id}>
                      <td>{r.startDate}</td>
                      <td>{r.cycleInfo}</td>
                      <td>{r.nextPayment}</td>
                      <td>{r.cyclesRemaining} / {r.totalCycles}</td>
                      <td><Link to={`/account/orders/${r.initialOrderId}`}>{r.initialOrderNumber}</Link></td>
                      <td className="actions">
                        {r.canCancel && <button className="link danger" onClick={() => cancel.mutate(r.id)}>Kündigen</button>}
                        {r.canRetryLastPayment && <button className="link" onClick={() => retry.mutate(r.id)}>Zahlung wiederholen</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </QueryView>
    </>
  )
}

export function GdprPage() {
  const toast = useToast()
  const tools = useQuery({ queryKey: ['gdpr'], queryFn: () => api.get<{ result?: string | null }>('/account/gdpr') })
  const remove = useMutation({ mutationFn: () => api.post<{ result?: string | null }>('/account/gdpr/delete') })
  return (
    <>
      <h1>DSGVO</h1>
      <ErrorMessage error={tools.error} />
      <div className="card">
        <h3>Persönliche Daten exportieren</h3>
        <button onClick={() => void api.download('/account/gdpr/export', undefined, 'POST').catch(e => toast(e.message, 'error'))}>Export herunterladen (XLSX)</button>
      </div>
      <div className="card">
        <h3>Konto löschen</h3>
        <p className="small">Der Shopbetreiber wird über Ihren Löschwunsch informiert.</p>
        <button className="danger" onClick={() => confirm('Löschung des Kontos beantragen?') && remove.mutate()}>Löschung beantragen</button>
        {remove.data?.result && <Notice kind="success">{remove.data.result}</Notice>}
        <ErrorMessage error={remove.error} />
      </div>
    </>
  )
}

export function GiftCardBalancePage() {
  const [giftCardCode, setCode] = useState('')
  const check = useMutation({ mutationFn: () => api.post<{ result?: string | null; message?: string | null }>('/account/gift-card-balance', { giftCardCode }) })
  return (
    <form className="card narrow" onSubmit={e => { e.preventDefault(); check.mutate() }}>
      <h1>Geschenkkarten-Guthaben</h1>
      <Field label="Code" required><input required value={giftCardCode} onChange={e => setCode(e.target.value)} /></Field>
      {check.data?.result && <Notice kind="success">Guthaben: {check.data.result}</Notice>}
      {check.data?.message && <Notice kind="warning">{check.data.message}</Notice>}
      <ErrorMessage error={check.error} />
      <button className="primary" disabled={check.isPending}>Prüfen</button>
    </form>
  )
}

/* ---------- vendor ---------- */

function VendorForm({ model, submit, title, onRemovePicture }: { model: VendorFormModel; submit: (form: FormData) => Promise<VendorFormModel>; title: string; onRemovePicture?: () => Promise<VendorFormModel> }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState({ name: model.name ?? '', email: model.email ?? '', description: model.description ?? '' })
  const [attributes, setAttributes] = useState(() => initialAttributeValues(model.vendorAttributes, 'vendor_attribute_'))
  const [file, setFile] = useState<File | null>(null)
  const [terms, setTerms] = useState(false)
  const save = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('Name', values.name)
      form.append('Email', values.email)
      form.append('Description', values.description)
      for (const [key, value] of Object.entries(attributes)) form.append(key, value)
      if (file) form.append('uploadedFile', file)
      return submit(form)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['vendor-form'] }),
  })
  const removePicture = useMutation({ mutationFn: () => onRemovePicture!(), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['vendor-form'] }) })

  return (
    <form className="card" onSubmit={e => { e.preventDefault(); save.mutate() }}>
      <h1>{title}</h1>
      {(save.data?.result ?? model.result) && <Notice kind="success">{save.data?.result ?? model.result}</Notice>}
      <fieldset disabled={model.disableFormInput}>
        <Field label="Name" required><input required value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} /></Field>
        <Field label="E-Mail" required><input type="email" required value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} /></Field>
        <Field label="Beschreibung"><textarea value={values.description} onChange={e => setValues({ ...values, description: e.target.value })} /></Field>
        <AttributeInputs attributes={model.vendorAttributes} prefix="vendor_attribute_" values={attributes} onChange={setAttributes} />
        <Field label="Bild">
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        {model.pictureUrl && (
          <div className="row">
            <Img url={model.pictureUrl} className="thumb" />
            {onRemovePicture && <button type="button" className="link danger" onClick={() => removePicture.mutate()}>Bild entfernen</button>}
          </div>
        )}
        {model.termsOfServiceEnabled && (
          <label className="option"><input type="checkbox" required checked={terms} onChange={e => setTerms(e.target.checked)} /> Ich akzeptiere die AGB</label>
        )}
        <ErrorMessage error={save.error} />
        <button className="primary" disabled={save.isPending}>Absenden</button>
      </fieldset>
    </form>
  )
}

export function ApplyVendorPage() {
  const form = useQuery({ queryKey: ['vendor-form', 'apply'], queryFn: () => api.get<VendorFormModel>('/vendor/apply') })
  return (
    <QueryView query={form}>
      {model => <VendorForm model={model} title="Händlerkonto beantragen" submit={data => api.post<VendorFormModel>('/vendor/apply', data)} />}
    </QueryView>
  )
}

export function VendorInfoPage() {
  const form = useQuery({ queryKey: ['vendor-form', 'info'], queryFn: () => api.get<VendorFormModel>('/vendor/info') })
  return (
    <QueryView query={form}>
      {model => (
        <VendorForm
          model={model}
          title="Händlerinformationen"
          submit={data => api.put<VendorFormModel>('/vendor/info', data)}
          onRemovePicture={() => api.delete<VendorFormModel>('/vendor/info/picture')}
        />
      )}
    </QueryView>
  )
}
