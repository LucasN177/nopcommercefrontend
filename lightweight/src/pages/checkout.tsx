import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api, ApiError } from '../api/client'
import { useCartChanged } from '../api/hooks'
import type {
  AddressModel,
  CheckoutBillingAddressModel,
  CheckoutCompletedModel,
  CheckoutConfirmModel,
  CheckoutPaymentMethodModel,
  CheckoutShippingAddressModel,
  CheckoutShippingMethodModel,
  CheckoutStepModel,
  CheckoutStepName,
  OnePageCheckoutModel,
  OrderTotalsModel,
  PaymentInfoModel,
  PickupPointsModel,
  PlaceOrderResultModel,
  ShoppingCartModel,
} from '../api/types'
import AddressForm, { AddressBlock, addressSummary } from '../components/AddressForm'
import { initialAttributeValues, type AttributeValues } from '../components/AttributeInputs'
import { ErrorMessage, Field, Html, Img, Loading, Notice, QueryView, Warnings } from '../components/ui'
import { useSession } from '../session'
import { OrderTotals } from './cart'

const STEPS: { name: CheckoutStepName; title: string; load: string }[] = [
  { name: 'billing_address', title: 'Rechnungsadresse', load: '/checkout/billing-address' },
  { name: 'shipping_address', title: 'Lieferadresse', load: '/checkout/shipping-address' },
  { name: 'shipping_method', title: 'Versandart', load: '/checkout/shipping-methods' },
  { name: 'payment_method', title: 'Zahlungsart', load: '/checkout/payment-methods' },
  { name: 'payment_info', title: 'Zahlungsdaten', load: '/checkout/payment-info' },
  { name: 'confirm', title: 'Bestätigen', load: '/checkout/confirm' },
]

interface StepProps<T> {
  model: T
  onNext: (step: CheckoutStepModel) => void
}

/* ---------- address steps ---------- */

function AddressChooser({
  existing,
  newAddress,
  preselectNew,
  countryType,
  submitLabel,
  children,
  onSubmit,
  pending,
  error,
}: {
  existing: AddressModel[]
  newAddress: AddressModel
  preselectNew: boolean
  countryType: number
  submitLabel: string
  children?: React.ReactNode
  onSubmit: (request: { addressId: number; newAddress: AddressModel | null; attributes: AttributeValues }) => void
  pending: boolean
  error: unknown
}) {
  const [addressId, setAddressId] = useState(preselectNew || !existing.length ? 0 : existing[0].id)
  const [address, setAddress] = useState(newAddress)
  const [attributes, setAttributes] = useState(() => initialAttributeValues(newAddress.customAddressAttributes, 'address_attribute_'))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ addressId, newAddress: addressId ? null : address, attributes }) }}>
      {existing.length > 0 && (
        <div className="options vertical">
          {existing.map(a => (
            <label key={a.id} className="option">
              <input type="radio" checked={addressId === a.id} onChange={() => setAddressId(a.id)} /> {addressSummary(a)}
            </label>
          ))}
          <label className="option">
            <input type="radio" checked={addressId === 0} onChange={() => setAddressId(0)} /> Neue Adresse
          </label>
        </div>
      )}
      {addressId === 0 && <AddressForm value={address} onChange={setAddress} attributes={attributes} onAttributesChange={setAttributes} countryType={countryType} />}
      {children}
      <ErrorMessage error={error} />
      <button className="primary" disabled={pending}>{submitLabel}</button>
    </form>
  )
}

function BillingStep({ model, onNext }: StepProps<CheckoutBillingAddressModel>) {
  const [shipToSame, setShipToSame] = useState(model.shipToSameAddress)
  const [vatNumber, setVatNumber] = useState(model.vatNumber ?? '')
  const save = useMutation({
    mutationFn: (request: object) => api.put<CheckoutStepModel>('/checkout/billing-address', request),
    onSuccess: onNext,
  })
  return (
    <AddressChooser
      existing={model.existingAddresses}
      newAddress={model.billingNewAddress}
      preselectNew={model.newAddressPreselected}
      countryType={10}
      submitLabel="Weiter"
      pending={save.isPending}
      error={save.error}
      onSubmit={request => save.mutate({ ...request, shipToSameAddress: shipToSame, vatNumber: vatNumber || null })}
    >
      {model.euVatEnabled && <Field label="USt-IdNr."><input value={vatNumber} onChange={e => setVatNumber(e.target.value)} /></Field>}
      {model.shipToSameAddressAllowed && (
        <label className="option">
          <input type="checkbox" checked={shipToSame} onChange={e => setShipToSame(e.target.checked)} /> An dieselbe Adresse liefern
        </label>
      )}
      {model.invalidExistingAddresses && model.invalidExistingAddresses.length > 0 && (
        <p className="small muted">{model.invalidExistingAddresses.length} gespeicherte Adresse(n) sind für die Rechnung nicht zulässig.</p>
      )}
    </AddressChooser>
  )
}

function PickupPoints({ model, value, onChange }: { model: PickupPointsModel; value: string; onChange: (v: string) => void }) {
  return (
    <div className="options vertical">
      <Warnings warnings={model.warnings} />
      {model.pickupPoints.map(p => {
        const key = `${p.id}___${p.providerSystemName}`
        return (
          <label key={key} className="option">
            <input type="radio" checked={value === key} onChange={() => onChange(key)} />
            <span>
              <strong>{p.name}</strong> {p.pickupFee && `(${p.pickupFee})`}
              <div className="small muted">{[p.address, p.zipPostalCode, p.city, p.countryName].filter(Boolean).join(', ')}</div>
              {p.openingHours && <div className="small">{p.openingHours}</div>}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function ShippingAddressStep({ model, onNext }: StepProps<CheckoutShippingAddressModel>) {
  const pickupModel = model.pickupPointsModel
  const pickupAllowed = model.displayPickupInStore && pickupModel?.allowPickupInStore
  const [pickup, setPickup] = useState(pickupAllowed && (pickupModel.pickupInStore || pickupModel.pickupInStoreOnly))
  const [pickupPoint, setPickupPoint] = useState(pickupModel?.pickupPoints[0] ? `${pickupModel.pickupPoints[0].id}___${pickupModel.pickupPoints[0].providerSystemName}` : '')
  const save = useMutation({
    mutationFn: (request: object) => api.put<CheckoutStepModel>('/checkout/shipping-address', request),
    onSuccess: onNext,
  })

  return (
    <>
      {pickupAllowed && (
        <label className="option">
          <input type="checkbox" checked={pickup} disabled={pickupModel.pickupInStoreOnly} onChange={e => setPickup(e.target.checked)} /> Im Geschäft abholen
        </label>
      )}
      {pickup ? (
        <form onSubmit={e => { e.preventDefault(); save.mutate({ pickupInStore: true, pickupPoint }) }}>
          <PickupPoints model={pickupModel} value={pickupPoint} onChange={setPickupPoint} />
          <ErrorMessage error={save.error} />
          <button className="primary" disabled={save.isPending || !pickupPoint}>Weiter</button>
        </form>
      ) : (
        <AddressChooser
          existing={model.existingAddresses}
          newAddress={model.shippingNewAddress}
          preselectNew={model.newAddressPreselected}
          countryType={20}
          submitLabel="Weiter"
          pending={save.isPending}
          error={save.error}
          onSubmit={request => save.mutate({ ...request, pickupInStore: false })}
        />
      )}
    </>
  )
}

/* ---------- method steps ---------- */

function ShippingMethodStep({ model, onNext }: StepProps<CheckoutShippingMethodModel>) {
  const optionKey = (m: CheckoutShippingMethodModel['shippingMethods'][number]) => `${m.name}___${m.shippingRateComputationMethodSystemName}`
  const [option, setOption] = useState(() => {
    const selected = model.shippingMethods.find(m => m.selected) ?? model.shippingMethods[0]
    return selected ? optionKey(selected) : ''
  })
  const [date, setDate] = useState('')
  const save = useMutation({
    mutationFn: () => api.put<CheckoutStepModel>('/checkout/shipping-method', { shippingOption: option, desiredDeliveryDate: date || null }),
    onSuccess: onNext,
  })
  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate() }}>
      <Warnings warnings={model.warnings} />
      {model.notifyCustomerAboutShippingFromMultipleLocations && <Notice kind="warning">Die Bestellung wird aus mehreren Lagern versendet.</Notice>}
      <div className="options vertical">
        {model.shippingMethods.map(m => (
          <label key={optionKey(m)} className="option">
            <input type="radio" checked={option === optionKey(m)} onChange={() => setOption(optionKey(m))} />
            <span>
              <strong>{m.name}</strong> ({m.fee})
              <Html html={m.description} className="small muted" />
            </span>
          </label>
        ))}
      </div>
      {model.allowCustomersToChooseDesiredDeliveryDate && (
        <Field label="Wunschliefertermin"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      )}
      <ErrorMessage error={save.error} />
      <button className="primary" disabled={save.isPending || !option}>Weiter</button>
    </form>
  )
}

function PaymentMethodStep({ model, onNext }: StepProps<CheckoutPaymentMethodModel>) {
  const [method, setMethod] = useState((model.paymentMethods.find(m => m.selected) ?? model.paymentMethods[0])?.paymentMethodSystemName ?? '')
  const [useRewardPoints, setUseRewardPoints] = useState(model.useRewardPoints ?? false)
  const save = useMutation({
    mutationFn: () => api.put<CheckoutStepModel>('/checkout/payment-method', { paymentMethodSystemName: method, useRewardPoints }),
    onSuccess: onNext,
  })
  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate() }}>
      {model.displayRewardPoints && (
        <label className="option">
          <input type="checkbox" checked={useRewardPoints} onChange={e => setUseRewardPoints(e.target.checked)} /> {model.rewardPointsBalance} Bonuspunkte einlösen ({model.rewardPointsAmount})
        </label>
      )}
      {model.paymentMethods.length === 0 && <Notice kind="warning">Keine Zahlungsart verfügbar.</Notice>}
      <div className="options vertical">
        {model.paymentMethods.map(m => (
          <label key={m.paymentMethodSystemName} className="option">
            <input type="radio" checked={method === m.paymentMethodSystemName} onChange={() => setMethod(m.paymentMethodSystemName)} />
            {m.logoUrl && <Img url={m.logoUrl} className="thumb-xs" />}
            <span>
              <strong>{m.name}</strong> {m.fee && `(${m.fee})`}
              <Html html={m.description} className="small muted" />
            </span>
          </label>
        ))}
      </div>
      <ErrorMessage error={save.error} />
      <button className="primary" disabled={save.isPending || (!method && !(useRewardPoints && model.rewardPointsEnoughToPayForOrder))}>Weiter</button>
    </form>
  )
}

/** Field names of the payment plugin form; the API passes them through (see API.md "Zahlungsdaten"). */
const PAYMENT_PRESETS: Record<string, Record<string, string>> = {
  'Payments.Manual': { CreditCardType: 'Visa', CardholderName: 'Test Kunde', CardNumber: '', ExpireMonth: '12', ExpireYear: String(new Date().getFullYear() + 2), CardCode: '' },
}

function PaymentInfoStep({ model, onNext }: StepProps<PaymentInfoModel>) {
  const [values, setValues] = useState<[string, string][]>(() => Object.entries(PAYMENT_PRESETS[model.paymentMethodSystemName] ?? { '': '' }))
  const save = useMutation({
    mutationFn: () => api.put<CheckoutStepModel>('/checkout/payment-info', { values: Object.fromEntries(values.filter(([k]) => k)) }),
    onSuccess: onNext,
  })
  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate() }}>
      <p>
        <strong>{model.paymentMethodName}</strong> <span className="small muted">({model.paymentMethodSystemName}, Typ {model.paymentMethodType})</span>
      </p>
      <Html html={model.paymentMethodDescription} className="small" />
      {!model.skipPaymentInfo && (
        <>
          <p className="small muted">Felder des Zahlungsplugins (Name → Wert):</p>
          {values.map(([key, value], i) => (
            <div key={i} className="row">
              <input placeholder="Feldname" value={key} onChange={e => setValues(v => v.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
              <input placeholder="Wert" value={value} onChange={e => setValues(v => v.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
              <button type="button" className="link danger" onClick={() => setValues(v => v.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button type="button" className="link" onClick={() => setValues(v => [...v, ['', '']])}>+ Feld</button>
        </>
      )}
      <ErrorMessage error={save.error} />
      <div><button className="primary" disabled={save.isPending}>Weiter</button></div>
    </form>
  )
}

/* ---------- confirm ---------- */

function OrderReview() {
  const cart = useQuery({ queryKey: ['cart'], queryFn: () => api.get<ShoppingCartModel & { orderReviewData?: OrderReviewData }>('/cart') })
  const totals = useQuery({ queryKey: ['cart-totals'], queryFn: () => api.get<OrderTotalsModel>('/cart/totals') })
  const c = cart.data
  if (!c) return <Loading />
  const review = c.orderReviewData
  return (
    <>
      {review?.display && (
        <div className="review-grid">
          <AddressBlock title="Rechnungsadresse" address={review.billingAddress} />
          {review.isShippable && (review.selectedPickupInStore ? <AddressBlock title="Abholung" address={review.pickupAddress} /> : <AddressBlock title="Lieferadresse" address={review.shippingAddress} />)}
          <div>
            {review.shippingMethod && <p><strong>Versandart:</strong> {review.shippingMethod}</p>}
            {review.paymentMethod && <p><strong>Zahlungsart:</strong> {review.paymentMethod}</p>}
          </div>
        </div>
      )}
      <table className="table">
        <tbody>
          {c.items.map(item => (
            <tr key={item.id}>
              <td>{item.productName}<Html html={item.attributeInfo} className="small" /></td>
              <td>{item.quantity} × {item.unitPrice}</td>
              <td>{item.subTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <OrderTotals totals={totals.data} />
    </>
  )
}

interface OrderReviewData {
  display: boolean
  billingAddress: AddressModel
  isShippable: boolean
  shippingAddress: AddressModel
  selectedPickupInStore: boolean
  pickupAddress: AddressModel
  shippingMethod: string | null
  paymentMethod: string | null
}

function ConfirmStep({ model }: { model: CheckoutConfirmModel }) {
  const navigate = useNavigate()
  const cartChanged = useCartChanged()
  const [terms, setTerms] = useState(false)
  const place = useMutation({
    mutationFn: () => api.post<PlaceOrderResultModel>('/checkout/confirm'),
    onSuccess: result => {
      cartChanged()
      if (result.paymentRedirectUrl) window.location.href = result.paymentRedirectUrl
      else navigate(`/checkout/completed/${result.orderId}`)
    },
  })
  return (
    <>
      <OrderReview />
      <Warnings warnings={[...(model.warnings ?? []), model.minOrderTotalWarning]} />
      {model.termsOfServiceOnOrderConfirmPage && (
        <label className="option">
          <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /> Ich akzeptiere die <Link to="/conditions-of-use" target="_blank">AGB</Link>
        </label>
      )}
      <ErrorMessage error={place.error} />
      <button
        className="primary large"
        disabled={place.isPending || (model.termsOfServiceOnOrderConfirmPage && !terms) || !!model.minOrderTotalWarning || (model.warnings?.length ?? 0) > 0}
        onClick={() => place.mutate()}
      >
        Kostenpflichtig bestellen
      </button>
    </>
  )
}

/* ---------- checkout page ---------- */

interface CurrentStep {
  name: CheckoutStepName
  model: unknown
  warnings: string[]
}

export function CheckoutPage() {
  const session = useSession()
  const [step, setStep] = useState<CurrentStep | null>(null)
  const [visited, setVisited] = useState<CheckoutStepName[]>([])
  const [loadingStep, setLoadingStep] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const start = useMutation({
    mutationFn: () => api.post<OnePageCheckoutModel>('/checkout/start'),
    onSuccess: model => {
      setStep({ name: 'billing_address', model: model.billingAddress, warnings: [] })
      setVisited(['billing_address'])
    },
  })
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    start.mutate()
  }, [start])

  async function goTo(name: CheckoutStepName, model?: unknown, warnings: string[] = []) {
    setLoadError(null)
    if (model === undefined || model === null) {
      setLoadingStep(true)
      try {
        model = await api.get(STEPS.find(s => s.name === name)!.load)
      } catch (error) {
        setLoadError(error)
        return
      } finally {
        setLoadingStep(false)
      }
    }
    setStep({ name, model, warnings })
    setVisited(v => (v.includes(name) ? v.slice(0, v.indexOf(name) + 1) : [...v, name]))
    window.scrollTo({ top: 0 })
  }

  const onNext = (result: CheckoutStepModel) => void goTo(result.nextStep, result.model, result.warnings)

  if (start.isError) {
    const forbidden = start.error instanceof ApiError && start.error.status === 403
    return (
      <>
        <h1>Kasse</h1>
        <ErrorMessage error={start.error} />
        {forbidden && !session.isRegistered && <Link className="button" to="/login?returnUrl=/checkout&checkout=1">Anmelden</Link>}
        <Link to="/cart">Zurück zum Warenkorb</Link>
      </>
    )
  }
  if (!step) return <Loading text="Checkout wird gestartet …" />

  const current = STEPS.find(s => s.name === step.name)!
  return (
    <>
      <h1>Kasse</h1>
      <ol className="steps">
        {STEPS.map(s => (
          <li key={s.name} className={s.name === step.name ? 'active' : visited.includes(s.name) ? 'done' : ''}>
            {visited.includes(s.name) && s.name !== step.name ? <button className="link" onClick={() => void goTo(s.name)}>{s.title}</button> : s.title}
          </li>
        ))}
      </ol>
      <div className="card">
        <h2>{current.title}</h2>
        <Warnings warnings={step.warnings} />
        <ErrorMessage error={loadError} />
        {loadingStep ? (
          <Loading />
        ) : (
          <div key={`${step.name}-${visited.length}`}>
            {step.name === 'billing_address' && <BillingStep model={step.model as CheckoutBillingAddressModel} onNext={onNext} />}
            {step.name === 'shipping_address' && <ShippingAddressStep model={step.model as CheckoutShippingAddressModel} onNext={onNext} />}
            {step.name === 'shipping_method' && <ShippingMethodStep model={step.model as CheckoutShippingMethodModel} onNext={onNext} />}
            {step.name === 'payment_method' && <PaymentMethodStep model={step.model as CheckoutPaymentMethodModel} onNext={onNext} />}
            {step.name === 'payment_info' && <PaymentInfoStep model={step.model as PaymentInfoModel} onNext={onNext} />}
            {step.name === 'confirm' && <ConfirmStep model={step.model as CheckoutConfirmModel} />}
          </div>
        )}
      </div>
    </>
  )
}

export function CheckoutCompletedPage() {
  const { orderId } = useParams()
  const session = useSession()
  const completed = useQuery({
    queryKey: ['checkout-completed', orderId],
    queryFn: () => api.get<CheckoutCompletedModel>(`/checkout/completed${orderId ? `/${orderId}` : ''}`),
  })
  return (
    <QueryView query={completed}>
      {c => (
        <div className="card narrow center">
          <h1>Vielen Dank für Ihre Bestellung!</h1>
          <p>Bestellnummer: <strong>{c.customOrderNumber}</strong></p>
          {session.isRegistered && <Link className="button" to={`/account/orders/${c.orderId}`}>Bestelldetails</Link>} <Link className="button" to="/">Weiter einkaufen</Link>
        </div>
      )}
    </QueryView>
  )
}
