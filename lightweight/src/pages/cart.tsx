import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { api, getToken } from '../api/client'
import { useCartChanged, useStates, useWishlistChanged } from '../api/hooks'
import type {
  AddWishlistItemsToCartResultModel,
  CartItemModel,
  CheckoutAttributesResultModel,
  CompareProductsModel,
  EmailAFriendModel,
  EstimateShippingModel,
  EstimateShippingResultModel,
  OrderTotalsModel,
  ShoppingCartModel,
  WishlistModel,
} from '../api/types'
import AttributeInputs, { initialAttributeValues, type AttributeValues } from '../components/AttributeInputs'
import { useToast } from '../components/Toast'
import { ErrorMessage, firstPicture, Html, Img, Notice, QueryView, Warnings } from '../components/ui'
import { EmailAFriendForm, ShippingOptions } from './product'

/* ---------- shared item table ---------- */

interface ItemTableProps {
  items: CartItemModel[]
  showSku: boolean
  showImages: boolean
  editable: boolean
  showVendor?: boolean
  onQuantity?: (item: CartItemModel, quantity: number) => void
  onRemove?: (item: CartItemModel) => void
  extraActions?: (item: CartItemModel) => React.ReactNode
  selection?: { selected: number[]; toggle: (id: number) => void }
}

function ItemTable({ items, showSku, showImages, editable, showVendor, onQuantity, onRemove, extraActions, selection }: ItemTableProps) {
  return (
    <table className="table cart-table">
      <thead>
        <tr>
          {selection && <th />}
          {showImages && <th />}
          <th>Produkt</th>
          <th>Einzelpreis</th>
          <th>Menge</th>
          <th>Summe</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            {selection && (
              <td><input type="checkbox" checked={selection.selected.includes(item.id)} onChange={() => selection.toggle(item.id)} /></td>
            )}
            {showImages && <td><Img picture={item.picture} className="thumb" /></td>}
            <td>
              <Link to={`/${item.productSeName}`}>{item.productName}</Link>
              {showSku && item.sku && <div className="small muted">Art.-Nr.: {item.sku}</div>}
              {showVendor && item.vendorName && <div className="small muted">Händler: {item.vendorName}</div>}
              <Html html={item.attributeInfo} className="small" />
              <Html html={item.recurringInfo} className="small" />
              <Html html={item.rentalInfo} className="small" />
              <Warnings warnings={item.warnings} />
            </td>
            <td>{item.unitPrice}</td>
            <td>
              {editable && onQuantity ? (
                item.allowedQuantities?.length ? (
                  <select value={item.quantity} onChange={e => onQuantity(item, +e.target.value)}>
                    {item.allowedQuantities.map(q => <option key={q.value} value={q.value}>{q.text}</option>)}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={0}
                    className="qty"
                    defaultValue={item.quantity}
                    onBlur={e => +e.target.value !== item.quantity && onQuantity(item, +e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                )
              ) : (
                item.quantity
              )}
            </td>
            <td>
              {item.subTotal}
              {item.discount && <div className="small success-text">Rabatt: {item.discount}</div>}
            </td>
            <td className="actions">
              {extraActions?.(item)}
              {editable && onRemove && !item.disableRemoval && <button className="link danger" onClick={() => onRemove(item)}>Entfernen</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ---------- cart ---------- */

export function OrderTotals({ totals, onRemoveGiftCard }: { totals?: OrderTotalsModel; onRemoveGiftCard?: (id: number) => void }) {
  if (!totals) return null
  const row = (label: string, value: React.ReactNode, strong = false) =>
    value !== null && value !== undefined && value !== '' ? (
      <tr className={strong ? 'total' : ''}><td>{label}</td><td>{value}</td></tr>
    ) : null
  return (
    <table className="table totals">
      <tbody>
        {row('Zwischensumme', totals.subTotal)}
        {row('Rabatt auf Zwischensumme', totals.subTotalDiscount)}
        {!totals.hideShippingTotal && totals.requiresShipping &&
          row(`Versand${totals.selectedShippingMethod ? ` (${totals.selectedShippingMethod})` : ''}`, totals.shipping ?? 'wird im Checkout berechnet')}
        {row('Zahlungsgebühr', totals.paymentMethodAdditionalFee)}
        {totals.displayTaxRates && totals.taxRates.map(t => row(`MwSt. ${t.rate} %`, t.value))}
        {totals.displayTax && row('MwSt.', totals.tax)}
        {row('Rabatt', totals.orderTotalDiscount)}
        {totals.giftCards.map(g => (
          <tr key={g.id}>
            <td>
              Geschenkkarte {g.couponCode} <span className="small muted">(Rest: {g.remaining})</span>{' '}
              {onRemoveGiftCard && totals.isEditable && <button className="link danger" onClick={() => onRemoveGiftCard(g.id)}>entfernen</button>}
            </td>
            <td>{g.amount}</td>
          </tr>
        ))}
        {totals.redeemedRewardPoints > 0 && row(`${totals.redeemedRewardPoints} Bonuspunkte`, totals.redeemedRewardPointsAmount)}
        {row('Gesamtsumme', totals.orderTotal ?? 'wird im Checkout berechnet', true)}
        {totals.willEarnRewardPoints > 0 && row('Sie erhalten', `${totals.willEarnRewardPoints} Bonuspunkte`)}
      </tbody>
    </table>
  )
}

function CodeBox({ title, placeholder, onApply, pending }: { title: string; placeholder: string; onApply: (code: string) => void; pending: boolean }) {
  const [code, setCode] = useState('')
  return (
    <form className="card" onSubmit={e => { e.preventDefault(); onApply(code); setCode('') }}>
      <h4>{title}</h4>
      <div className="row">
        <input value={code} placeholder={placeholder} onChange={e => setCode(e.target.value)} required />
        <button disabled={pending}>Anwenden</button>
      </div>
    </form>
  )
}

function CartEstimateShipping({ checkoutAttributes }: { checkoutAttributes: AttributeValues }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const form = useQuery({ queryKey: ['cart-estimate-form'], queryFn: () => api.get<EstimateShippingModel>('/cart/estimate-shipping') })
  const [address, setAddress] = useState<{ countryId: number | null; stateProvinceId: number | null; zipPostalCode: string; city: string } | null>(null)
  const a = address ?? {
    countryId: form.data?.countryId ?? null,
    stateProvinceId: form.data?.stateProvinceId ?? null,
    zipPostalCode: form.data?.zipPostalCode ?? '',
    city: form.data?.city ?? '',
  }
  const states = useStates(a.countryId)

  const estimate = useMutation({
    mutationFn: () => api.post<EstimateShippingResultModel>('/cart/estimate-shipping', { ...a, checkoutAttributes }),
  })
  const select = useMutation({
    mutationFn: (name: string) => api.post<OrderTotalsModel>('/cart/select-shipping-option', { ...a, name }),
    onSuccess: totals => {
      queryClient.setQueryData(['cart-totals'], totals)
      toast('Versandart übernommen')
      estimate.mutate()
    },
    onError: error => toast(error.message, 'error'),
  })

  if (!form.data?.enabled) return null
  return (
    <div className="card">
      <h4>Versandkosten schätzen</h4>
      <div className="row wrap">
        <select value={a.countryId ?? ''} onChange={e => setAddress({ ...a, countryId: e.target.value ? +e.target.value : null, stateProvinceId: null })}>
          {form.data.availableCountries.map(c => <option key={c.value} value={c.value === '0' ? '' : c.value}>{c.text}</option>)}
        </select>
        {states.data && states.data.length > 1 && (
          <select value={a.stateProvinceId ?? 0} onChange={e => setAddress({ ...a, stateProvinceId: +e.target.value })}>
            {states.data.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {form.data.useCity ? (
          <input placeholder="Stadt" value={a.city} onChange={e => setAddress({ ...a, city: e.target.value })} />
        ) : (
          <input placeholder="PLZ" className="qty" value={a.zipPostalCode} onChange={e => setAddress({ ...a, zipPostalCode: e.target.value })} />
        )}
        <button onClick={() => estimate.mutate()} disabled={estimate.isPending}>Berechnen</button>
      </div>
      <ErrorMessage error={estimate.error} />
      {estimate.data && <ShippingOptions result={estimate.data} onSelect={name => select.mutate(name)} />}
    </div>
  )
}

export function CartPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const cartChanged = useCartChanged()
  const cart = useQuery({ queryKey: ['cart'], queryFn: () => api.get<ShoppingCartModel>('/cart') })
  const totals = useQuery({ queryKey: ['cart-totals'], queryFn: () => api.get<OrderTotalsModel>('/cart/totals') })
  const [attributes, setAttributes] = useState<AttributeValues | null>(null)
  const [conditions, setConditions] = useState<{ hidden: number[]; warnings: string[] }>({ hidden: [], warnings: [] })
  const [termsAccepted, setTermsAccepted] = useState(false)

  const onCart = (c: ShoppingCartModel) => cartChanged(c)
  const onError = (error: Error) => toast(error.message, 'error')
  const update = useMutation({
    mutationFn: ({ item, quantity }: { item: CartItemModel; quantity: number }) => api.put<ShoppingCartModel>(`/cart/items/${item.id}`, { quantity }),
    onSuccess: onCart,
    onError,
  })
  const remove = useMutation({ mutationFn: (item: CartItemModel) => api.delete<ShoppingCartModel>(`/cart/items/${item.id}`), onSuccess: onCart, onError })
  const clear = useMutation({ mutationFn: () => api.delete<ShoppingCartModel>('/cart'), onSuccess: onCart, onError })
  const applyCoupon = useMutation({ mutationFn: (code: string) => api.post<ShoppingCartModel>('/cart/discount-coupons', { code }), onSuccess: onCart, onError })
  const removeCoupon = useMutation({ mutationFn: (id: number) => api.delete<ShoppingCartModel>(`/cart/discount-coupons/${id}`), onSuccess: onCart, onError })
  const applyGiftCard = useMutation({ mutationFn: (code: string) => api.post<ShoppingCartModel>('/cart/gift-cards', { code }), onSuccess: onCart, onError })
  const removeGiftCard = useMutation({ mutationFn: (id: number) => api.delete<ShoppingCartModel>(`/cart/gift-cards/${id}`), onSuccess: onCart, onError })
  const setVendor = useMutation({ mutationFn: (vendorId: number) => api.put<ShoppingCartModel>('/cart/vendor', { vendorId }), onSuccess: onCart, onError })
  const saveAttributes = useMutation({
    mutationFn: (values: AttributeValues) => api.put<CheckoutAttributesResultModel>('/cart/checkout-attributes', { attributes: values }),
    onSuccess: result => {
      cartChanged(result.cart)
      setConditions({ hidden: result.disabledAttributeIds, warnings: result.warnings })
    },
    onError,
  })

  const uploadAttribute = async (attr: { id: number }, file: File) =>
    (await api.upload<{ downloadGuid: string }>(`/cart/checkout-attributes/${attr.id}/upload`, file)).downloadGuid

  return (
    <QueryView query={cart}>
      {c => {
        const attributeValues = attributes ?? initialAttributeValues(c.checkoutAttributes, 'checkout_attribute_')
        const changeAttributes = (values: AttributeValues) => {
          setAttributes(values)
          saveAttributes.mutate(values)
        }

        async function checkout() {
          if (c.checkoutAttributes.length) {
            const result = await saveAttributes.mutateAsync(attributeValues)
            if (result.warnings.length) return
          }
          navigate('/checkout')
        }

        if (!c.items.length)
          return (
            <>
              <h1>Warenkorb</h1>
              <Notice>Ihr Warenkorb ist leer.</Notice>
              <Warnings warnings={c.warnings} />
            </>
          )

        return (
          <>
            <div className="row space-between">
              <h1>Warenkorb</h1>
              {c.isEditable && <button className="link danger" onClick={() => clear.mutate()}>Warenkorb leeren</button>}
            </div>
            <Warnings warnings={[...c.warnings, c.minOrderSubtotalWarning]} />

            {c.displayVendorList && (
              <div className="card row">
                <span>Nur Produkte dieses Händlers bestellen:</span>
                <select value={c.selectedVendorId} onChange={e => setVendor.mutate(+e.target.value)}>
                  <option value={0}>Alle Händler</option>
                  {c.availableVendors.map(v => ('value' in v ? <option key={v.value} value={v.value}>{v.text}</option> : <option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              </div>
            )}

            <ItemTable
              items={c.items}
              showSku={c.showSku}
              showImages={c.showProductImages}
              showVendor={c.showVendorName}
              editable={c.isEditable}
              onQuantity={(item, quantity) => update.mutate({ item, quantity })}
              onRemove={item => remove.mutate(item)}
            />

            <div className="cart-bottom">
              <div>
                {c.checkoutAttributes.length > 0 && (
                  <div className="card">
                    <h4>Bestelloptionen</h4>
                    <AttributeInputs
                      attributes={c.checkoutAttributes}
                      prefix="checkout_attribute_"
                      values={attributeValues}
                      onChange={changeAttributes}
                      hiddenIds={conditions.hidden}
                      onUpload={uploadAttribute}
                    />
                    <Warnings warnings={conditions.warnings} />
                  </div>
                )}
                {c.discountBox.display && (
                  <>
                    <CodeBox title="Gutscheincode" placeholder="Code" pending={applyCoupon.isPending} onApply={code => applyCoupon.mutate(code)} />
                    {c.discountBox.messages.length > 0 && <Notice kind={c.discountBox.isApplied ? 'success' : 'warning'}>{c.discountBox.messages.join(' ')}</Notice>}
                    {c.discountBox.appliedDiscountsWithCodes.map(d => (
                      <div key={d.id} className="small">
                        Gutschein <strong>{d.couponCode}</strong> <button className="link danger" onClick={() => removeCoupon.mutate(d.id)}>entfernen</button>
                      </div>
                    ))}
                  </>
                )}
                {c.giftCardBox.display && (
                  <>
                    <CodeBox title="Geschenkkarte" placeholder="Geschenkkarten-Code" pending={applyGiftCard.isPending} onApply={code => applyGiftCard.mutate(code)} />
                    {c.giftCardBox.message && <Notice kind={c.giftCardBox.isApplied ? 'success' : 'warning'}>{c.giftCardBox.message}</Notice>}
                  </>
                )}
                <CartEstimateShipping checkoutAttributes={attributeValues} />
              </div>

              <div className="card">
                <OrderTotals totals={totals.data} onRemoveGiftCard={id => removeGiftCard.mutate(id)} />
                {c.termsOfServiceOnShoppingCartPage && (
                  <label className="option">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /> Ich akzeptiere die{' '}
                    <Link to="/conditions-of-use" target="_blank">AGB</Link>
                  </label>
                )}
                {!c.hideCheckoutButton && (
                  <button
                    className="primary block"
                    disabled={(c.termsOfServiceOnShoppingCartPage && !termsAccepted) || saveAttributes.isPending}
                    onClick={() => void checkout()}
                  >
                    Zur Kasse
                  </button>
                )}
                <button className="link" onClick={() => void queryClient.invalidateQueries({ queryKey: ['cart-totals'] })}>Summen aktualisieren</button>
              </div>
            </div>
          </>
        )
      }}
    </QueryView>
  )
}

/* ---------- wishlist ---------- */

export function WishlistPage() {
  const { customerGuid } = useParams()
  const shared = !!customerGuid
  const [params, setParams] = useSearchParams()
  const listId = params.get('list') ? Number(params.get('list')) : null
  const toast = useToast()
  const cartChanged = useCartChanged()
  const wishlistChanged = useWishlistChanged()
  const [selected, setSelected] = useState<number[]>([])
  const [newList, setNewList] = useState('')

  const wishlist = useQuery({
    queryKey: shared ? ['wishlist-shared', customerGuid, listId] : ['wishlist', listId],
    queryFn: () => (shared ? api.get<WishlistModel>(`/wishlist/shared/${customerGuid}`, { listId }) : api.get<WishlistModel>('/wishlist', { listId })),
  })

  const onWishlist = (w: WishlistModel) => wishlistChanged(w)
  const onError = (error: Error) => toast(error.message, 'error')
  const update = useMutation({
    mutationFn: ({ item, quantity }: { item: CartItemModel; quantity: number }) => api.put<WishlistModel>(`/wishlist/items/${item.id}`, { quantity }),
    onSuccess: onWishlist,
    onError,
  })
  const remove = useMutation({ mutationFn: (item: CartItemModel) => api.delete<WishlistModel>(`/wishlist/items/${item.id}`), onSuccess: onWishlist, onError })
  const moveToCart = useMutation({
    mutationFn: (item: CartItemModel) => api.post<WishlistModel>(`/wishlist/items/${item.id}/move-to-cart`),
    onSuccess: w => {
      onWishlist(w)
      cartChanged()
      toast('In den Warenkorb verschoben')
    },
    onError,
  })
  const moveToList = useMutation({
    mutationFn: ({ item, target }: { item: CartItemModel; target: number }) => api.post<WishlistModel>(`/wishlist/items/${item.id}/move`, { listId: target || null }),
    onSuccess: onWishlist,
    onError,
  })
  const addSelectedToCart = useMutation({
    mutationFn: () => api.post<AddWishlistItemsToCartResultModel>('/wishlist/add-to-cart', { itemIds: selected, customerGuid: shared ? customerGuid : null, listId }),
    onSuccess: result => {
      if (!shared) onWishlist(result.wishlist)
      cartChanged()
      setSelected([])
      toast(`${result.addedItemsCount} Artikel in den Warenkorb gelegt`)
      if (result.message) toast(result.message, 'error')
    },
    onError,
  })
  const createList = useMutation({
    mutationFn: () => api.post<WishlistModel>('/wishlist/lists', { name: newList }),
    onSuccess: w => {
      onWishlist(w)
      setNewList('')
    },
    onError,
  })
  const renameList = useMutation({ mutationFn: (name: string) => api.put<WishlistModel>(`/wishlist/lists/${listId}`, { name }), onSuccess: onWishlist, onError })
  const deleteList = useMutation({
    mutationFn: () => api.delete<WishlistModel>(`/wishlist/lists/${listId}`),
    onSuccess: w => {
      onWishlist(w)
      setParams({})
    },
    onError,
  })

  return (
    <QueryView query={wishlist}>
      {w => {
        // the own wishlist has no customerGuid in the model, so the GUID of the token is used for the share link
        const guid = /^[0-]+$/.test(w.customerGuid) ? getToken()?.customerGuid : w.customerGuid
        const shareUrl = `${window.location.origin}/wishlist/${guid}${listId ? `?list=${listId}` : ''}`
        return (
          <>
            <h1>{shared ? `Wunschliste von ${w.customerFullname ?? 'Kunde'}` : 'Wunschliste'}{w.customWishlistName && ` – ${w.customWishlistName}`}</h1>

            {w.allowMultipleWishlist && (
              <div className="tabs">
                <button className={!listId ? 'active' : ''} onClick={() => setParams({})}>Standard</button>
                {w.customWishlistItems.map(l => (
                  <button key={l.id} className={listId === l.id ? 'active' : ''} onClick={() => setParams({ list: String(l.id) })}>{l.name}</button>
                ))}
                {!shared && (
                  <form className="row" onSubmit={e => { e.preventDefault(); createList.mutate() }}>
                    <input placeholder="Neue Liste" value={newList} onChange={e => setNewList(e.target.value)} required />
                    <button>+</button>
                  </form>
                )}
              </div>
            )}
            {!shared && listId && (
              <div className="row">
                <button className="link" onClick={() => { const name = prompt('Neuer Name', w.customWishlistName ?? ''); if (name) renameList.mutate(name) }}>Umbenennen</button>
                <button className="link danger" onClick={() => confirm('Liste inkl. Artikel löschen?') && deleteList.mutate()}>Liste löschen</button>
              </div>
            )}

            <Warnings warnings={w.warnings} />
            {w.items.length === 0 ? (
              <Notice>Die Wunschliste ist leer.</Notice>
            ) : (
              <>
                <ItemTable
                  items={w.items}
                  showSku={w.showSku}
                  showImages={w.showProductImages}
                  editable={w.isEditable}
                  onQuantity={(item, quantity) => update.mutate({ item, quantity })}
                  onRemove={item => remove.mutate(item)}
                  selection={w.displayAddToCart ? { selected, toggle: id => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id])) } : undefined}
                  extraActions={item =>
                    w.isEditable && (
                      <>
                        {w.displayAddToCart && !item.disableAddToCart && <button className="link" onClick={() => moveToCart.mutate(item)}>In den Warenkorb</button>}
                        {w.allowMultipleWishlist && (
                          <select value="" onChange={e => moveToList.mutate({ item, target: +e.target.value })}>
                            <option value="" disabled>Verschieben …</option>
                            {listId && <option value={0}>Standard</option>}
                            {w.customWishlistItems.filter(l => l.id !== listId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        )}
                      </>
                    )
                  }
                />
                {w.displayAddToCart && (
                  <button className="primary" disabled={!selected.length || addSelectedToCart.isPending} onClick={() => addSelectedToCart.mutate()}>
                    Ausgewählte in den Warenkorb ({selected.length})
                  </button>
                )}
              </>
            )}

            {!shared && (
              <div className="card">
                <h4>Wunschliste teilen</h4>
                <code className="share">{shareUrl}</code>
                {w.emailWishlistEnabled && <div><Link to={`/emailwishlist${listId ? `?list=${listId}` : ''}`}>Per E-Mail an einen Freund senden</Link></div>}
              </div>
            )}
          </>
        )
      }}
    </QueryView>
  )
}

export function WishlistEmailPage() {
  const [params] = useSearchParams()
  const listId = params.get('list') ? Number(params.get('list')) : null
  const form = useQuery({ queryKey: ['wishlist-email', listId], queryFn: () => api.get<EmailAFriendModel>('/wishlist/email', { listId }) })
  return (
    <>
      <h1>Wunschliste per E-Mail senden</h1>
      <QueryView query={form}>
        {model => <EmailAFriendForm initial={model} send={values => api.post<EmailAFriendModel>('/wishlist/email', { ...values, listId })} />}
      </QueryView>
    </>
  )
}

/* ---------- compare ---------- */

export function ComparePage() {
  const queryClient = useQueryClient()
  const compare = useQuery({ queryKey: ['compare'], queryFn: () => api.get<CompareProductsModel>('/compare') })
  const set = (m: CompareProductsModel) => queryClient.setQueryData(['compare'], m)
  const remove = useMutation({ mutationFn: (id: number) => api.delete<CompareProductsModel>(`/compare/${id}`), onSuccess: set })
  const clear = useMutation({ mutationFn: () => api.delete<CompareProductsModel>('/compare'), onSuccess: set })

  return (
    <QueryView query={compare}>
      {m => {
        if (!m.products.length)
          return (
            <>
              <h1>Produktvergleich</h1>
              <Notice>Es sind keine Produkte zum Vergleichen ausgewählt.</Notice>
            </>
          )
        // union of all specification attributes of the compared products
        const specs = new Map<string, string>()
        for (const p of m.products)
          for (const g of p.productSpecificationModel?.groups ?? []) for (const a of g.attributes) specs.set(`${g.id}-${a.id}`, a.name)
        const specValue = (p: (typeof m.products)[number], key: string) => {
          for (const g of p.productSpecificationModel?.groups ?? [])
            for (const a of g.attributes) if (`${g.id}-${a.id}` === key) return a.values.map(v => v.valueRaw).join(', ')
          return ''
        }

        return (
          <>
            <div className="row space-between">
              <h1>Produktvergleich</h1>
              <button className="link danger" onClick={() => clear.mutate()}>Liste leeren</button>
            </div>
            <div className="scroll-x">
              <table className="table compare">
                <tbody>
                  <tr>
                    <td />
                    {m.products.map(p => (
                      <td key={p.id}>
                        <button className="link danger" onClick={() => remove.mutate(p.id)}>Entfernen</button>
                        <Img picture={firstPicture(p)} className="thumb" />
                      </td>
                    ))}
                  </tr>
                  <tr><th>Name</th>{m.products.map(p => <td key={p.id}><Link to={`/${p.seName}`}>{p.name}</Link></td>)}</tr>
                  <tr><th>Preis</th>{m.products.map(p => <td key={p.id}>{p.productPrice?.price}</td>)}</tr>
                  {m.includeShortDescriptionInCompareProducts && <tr><th>Kurzbeschreibung</th>{m.products.map(p => <td key={p.id}><Html html={p.shortDescription} /></td>)}</tr>}
                  {m.includeFullDescriptionInCompareProducts && <tr><th>Beschreibung</th>{m.products.map(p => <td key={p.id}><Html html={p.fullDescription} /></td>)}</tr>}
                  {[...specs].map(([key, name]) => (
                    <tr key={key}><th>{name}</th>{m.products.map(p => <td key={p.id} dangerouslySetInnerHTML={{ __html: specValue(p, key) }} />)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      }}
    </QueryView>
  )
}
