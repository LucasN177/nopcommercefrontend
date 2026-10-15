import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, storeUrl } from '../api/client'
import { useCountries, useStates } from '../api/hooks'
import type {
  AddProductReviewResultModel,
  BackInStockSubscribeModel,
  BackInStockSubscriptionResultModel,
  EmailAFriendModel,
  EstimateShippingResultModel,
  ProductAttributeChangeModel,
  ProductDetailsModel,
  ProductOverviewModel,
  ProductReviewsModel,
  ReviewHelpfulnessResultModel,
  UploadedFileModel,
} from '../api/types'
import AttributeInputs, { initialAttributeValues, type AttributeValues } from '../components/AttributeInputs'
import { ProductGrid } from '../components/ProductCard'
import { useProductActions, type AddToCartRequest } from '../components/productActions'
import { useToast } from '../components/Toast'
import { Breadcrumb, ErrorMessage, Field, Html, Img, Notice, QueryView, Rating, Warnings } from '../components/ui'

/* ---------- buy box ---------- */

function GiftCardFields({ product, values, onChange }: { product: ProductDetailsModel; values: AttributeValues; onChange: (v: AttributeValues) => void }) {
  if (!product.giftCard?.isGiftCard) return null
  const prefix = `giftcard_${product.id}.`
  const virtual = product.giftCard.giftCardType === 0
  const input = (name: string, label: string, type = 'text', required = false) => (
    <Field label={label} required={required}>
      <input type={type} value={values[prefix + name] ?? ''} onChange={e => onChange({ ...values, [prefix + name]: e.target.value })} />
    </Field>
  )
  return (
    <div className="card">
      <h4>Geschenkkarte</h4>
      <div className="form-grid">
        {input('RecipientName', 'Name des Empfängers', 'text', true)}
        {virtual && input('RecipientEmail', 'E-Mail des Empfängers', 'email', true)}
        {input('SenderName', 'Ihr Name', 'text', true)}
        {virtual && input('SenderEmail', 'Ihre E-Mail', 'email', true)}
      </div>
      <Field label="Nachricht">
        <textarea value={values[prefix + 'Message'] ?? ''} onChange={e => onChange({ ...values, [prefix + 'Message']: e.target.value })} />
      </Field>
    </div>
  )
}

function BackInStock({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const status = useQuery({
    queryKey: ['back-in-stock', productId],
    queryFn: () => api.get<BackInStockSubscribeModel>(`/products/${productId}/back-in-stock-subscription`),
  })
  const toggle = useMutation({
    mutationFn: () => api.post<BackInStockSubscriptionResultModel>(`/products/${productId}/back-in-stock-subscription`),
    onSuccess: result => {
      toast(result.message)
      void queryClient.invalidateQueries({ queryKey: ['back-in-stock', productId] })
    },
    onError: error => toast(error.message, 'error'),
  })
  if (!status.data) return null
  if (!status.data.isCurrentCustomerRegistered) return <Notice>Melden Sie sich an, um bei Verfügbarkeit benachrichtigt zu werden.</Notice>
  return (
    <button onClick={() => toggle.mutate()} disabled={toggle.isPending}>
      {status.data.alreadySubscribed ? 'Benachrichtigung abbestellen' : 'Benachrichtigen, wenn verfügbar'}
    </button>
  )
}

function EstimateShipping({ productId, buildRequest }: { productId: number; buildRequest: () => AddToCartRequest }) {
  const [countryId, setCountryId] = useState<number | null>(null)
  const [stateProvinceId, setStateProvinceId] = useState<number | null>(null)
  const [zip, setZip] = useState('')
  const countries = useCountries(20)
  const states = useStates(countryId)
  const estimate = useMutation({
    mutationFn: () => {
      const r = buildRequest()
      return api.post<EstimateShippingResultModel>(`/products/${productId}/estimate-shipping`, {
        countryId,
        stateProvinceId,
        zipPostalCode: zip,
        quantity: r.quantity,
        attributes: r.attributes,
        customerEnteredPrice: r.customerEnteredPrice,
        rentalStartDate: r.rentalStartDate,
        rentalEndDate: r.rentalEndDate,
      })
    },
  })

  return (
    <details className="card">
      <summary>Versandkosten schätzen</summary>
      <div className="row wrap">
        <select value={countryId ?? ''} onChange={e => setCountryId(e.target.value ? +e.target.value : null)}>
          <option value="">Land</option>
          {countries.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {states.data && states.data.length > 1 && (
          <select value={stateProvinceId ?? 0} onChange={e => setStateProvinceId(+e.target.value)}>
            {states.data.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <input placeholder="PLZ" value={zip} onChange={e => setZip(e.target.value)} className="qty" />
        <button onClick={() => estimate.mutate()} disabled={estimate.isPending}>Berechnen</button>
      </div>
      <ErrorMessage error={estimate.error} />
      {estimate.data && <ShippingOptions result={estimate.data} />}
    </details>
  )
}

export function ShippingOptions({ result, onSelect }: { result: EstimateShippingResultModel; onSelect?: (name: string) => void }) {
  return (
    <>
      <Warnings warnings={result.errors} />
      {result.shippingOptions.length > 0 && (
        <table className="table">
          <thead><tr><th>Versandart</th><th>Lieferzeit</th><th>Preis</th>{onSelect && <th />}</tr></thead>
          <tbody>
            {result.shippingOptions.map(o => (
              <tr key={o.name}>
                <td>{o.name}<div className="small muted">{o.description}</div></td>
                <td>{o.deliveryDateFormat}</td>
                <td>{o.price}</td>
                {onSelect && <td><button className={o.selected ? 'primary' : ''} onClick={() => onSelect(o.name)}>{o.selected ? 'Gewählt' : 'Wählen'}</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function BuyBox({ product, onPictureChange }: { product: ProductDetailsModel; onPictureChange: (url: string | null) => void }) {
  const toast = useToast()
  const { addToCart, addToWishlist, addToCompare } = useProductActions()
  const [attributes, setAttributes] = useState<AttributeValues>(() => initialAttributeValues(product.productAttributes, 'product_attribute_'))
  const [quantity, setQuantity] = useState(product.addToCart.enteredQuantity || 1)
  const [enteredPrice, setEnteredPrice] = useState(product.addToCart.customerEnteredPrice || 0)
  const [rentalStart, setRentalStart] = useState('')
  const [rentalEnd, setRentalEnd] = useState('')

  // Recalculate price, SKU, stock, conditions and picture after attribute changes (like the storefront)
  const change = useQuery({
    queryKey: ['attribute-change', product.id, attributes, rentalStart, rentalEnd],
    queryFn: () =>
      api.post<ProductAttributeChangeModel>(`/products/${product.id}/attributes/change`, {
        attributes,
        rentalStartDate: rentalStart || null,
        rentalEndDate: rentalEnd || null,
        validateAttributeConditions: true,
        loadPicture: true,
      }),
    enabled: !!product.productAttributes?.length || !!product.isRental,
    placeholderData: previous => previous,
  })
  const c = change.data
  useEffect(() => onPictureChange(c?.pictureDefaultSizeUrl ?? null), [c?.pictureDefaultSizeUrl, onPictureChange])

  const buildRequest = (): AddToCartRequest => {
    // hidden (conditional) attributes are not sent
    const visible = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => !c?.disabledAttributeMappingIds.some(id => key === `product_attribute_${id}` || key.startsWith(`product_attribute_${id}_`))),
    )
    return {
      productId: product.id,
      quantity,
      attributes: visible,
      customerEnteredPrice: product.addToCart.customerEntersPrice ? enteredPrice : null,
      rentalStartDate: rentalStart || null,
      rentalEndDate: rentalEnd || null,
    }
  }

  const upload = async (attr: { id: number }, file: File) => {
    const result = await api.upload<UploadedFileModel>(`/products/${product.id}/attributes/${attr.id}/upload`, file)
    if (result.message) toast(result.message, 'info')
    return result.downloadGuid
  }

  const price = product.productPrice
  const ac = product.addToCart

  return (
    <div className="buybox">
      <div className="meta small">
        {product.showSku && (c?.sku ?? product.sku) && <div>Art.-Nr.: {c?.sku ?? product.sku}</div>}
        {product.showManufacturerPartNumber && (c?.mpn ?? product.manufacturerPartNumber) && <div>MPN: {c?.mpn ?? product.manufacturerPartNumber}</div>}
        {product.showGtin && (c?.gtin ?? product.gtin) && <div>GTIN: {c?.gtin ?? product.gtin}</div>}
        {product.showVendor && product.vendorModel && <div>Händler: <Link to={`/${product.vendorModel.seName}`}>{product.vendorModel.name}</Link></div>}
        {product.productManufacturers && product.productManufacturers.length > 0 && (
          <div>Hersteller: {product.productManufacturers.map((m, i) => <span key={m.id}>{i > 0 && ', '}<Link to={`/${m.seName}`}>{m.name}</Link></span>)}</div>
        )}
        {(c?.stockAvailability ?? product.stockAvailability) && <div>Verfügbarkeit: <strong>{c?.stockAvailability ?? product.stockAvailability}</strong></div>}
        {product.deliveryDate && <div>Lieferzeit: {product.deliveryDate}</div>}
        {(c?.isFreeShipping ?? product.isFreeShipping) && <div className="success-text">Kostenloser Versand</div>}
      </div>

      {!price.hidePrices && (
        <div className="price large">
          {price.callForPrice ? (
            <strong>Preis auf Anfrage</strong>
          ) : (
            <>
              {(c?.oldPrice ?? price.oldPrice) && <s className="old-price">{c?.oldPrice ?? price.oldPrice}</s>}{' '}
              <strong>{c?.price || price.priceWithDiscount || price.price}</strong>
              {price.isRental && price.rentalPrice && <div className="small">{price.rentalPrice}</div>}
              {(c?.basePricePAngV ?? price.basePricePAngV) && <div className="small muted">{c?.basePricePAngV ?? price.basePricePAngV}</div>}
            </>
          )}
        </div>
      )}

      {product.tierPrices && product.tierPrices.length > 0 && (
        <table className="table small">
          <thead><tr><th>Menge</th>{product.tierPrices.map(t => <th key={t.quantity}>{t.quantity}+</th>)}</tr></thead>
          <tbody><tr><td>Preis</td>{product.tierPrices.map(t => <td key={t.quantity}>{t.price}</td>)}</tr></tbody>
        </table>
      )}

      <AttributeInputs
        attributes={product.productAttributes}
        prefix="product_attribute_"
        values={attributes}
        onChange={setAttributes}
        hiddenIds={c?.disabledAttributeMappingIds}
        onUpload={upload}
      />
      <Warnings warnings={c?.messages} />

      <GiftCardFields product={product} values={attributes} onChange={setAttributes} />

      {product.isRental && (
        <div className="form-grid">
          <Field label="Mietbeginn"><input type="date" value={rentalStart} onChange={e => setRentalStart(e.target.value)} /></Field>
          <Field label="Mietende"><input type="date" value={rentalEnd} onChange={e => setRentalEnd(e.target.value)} /></Field>
        </div>
      )}

      {ac.customerEntersPrice && (
        <Field label="Ihr Preis" hint={ac.customerEnteredPriceRange}>
          <input type="number" step="0.01" value={enteredPrice} onChange={e => setEnteredPrice(+e.target.value)} />
        </Field>
      )}

      {ac.minimumQuantityNotification && <p className="small muted">{ac.minimumQuantityNotification}</p>}
      {ac.availableForPreOrder && ac.preOrderAvailabilityStartDateTimeUtc && (
        <p className="small">Vorbestellbar, verfügbar ab {new Date(ac.preOrderAvailabilityStartDateTimeUtc).toLocaleDateString()}</p>
      )}

      <div className="row wrap">
        {ac.allowedQuantities.length > 0 ? (
          <select value={quantity} onChange={e => setQuantity(+e.target.value)}>
            {ac.allowedQuantities.map(q => <option key={q.value} value={q.value}>{q.text}</option>)}
          </select>
        ) : (
          <input type="number" min={1} className="qty" value={quantity} onChange={e => setQuantity(+e.target.value)} />
        )}
        {!ac.disableBuyButton && (
          <button className="primary" disabled={addToCart.isPending} onClick={() => addToCart.mutate({ request: buildRequest() })}>
            {ac.availableForPreOrder ? 'Vorbestellen' : ac.isRental ? 'Mieten' : 'In den Warenkorb'}
          </button>
        )}
        {!ac.disableWishlistButton && <button onClick={() => addToWishlist.mutate({ request: buildRequest() })}>Auf die Wunschliste</button>}
        {product.compareProductsEnabled && <button onClick={() => addToCompare.mutate(product.id)}>Vergleichen</button>}
        {product.emailAFriendEnabled && <Link className="button" to={`/productemailafriend/${product.id}`}>Weiterempfehlen</Link>}
        {product.hasSampleDownload && <button onClick={() => void api.download(`/downloads/sample/${product.id}`).catch(e => toast(e.message, 'error'))}>Muster herunterladen</button>}
      </div>

      {product.displayBackInStockSubscription && <BackInStock productId={product.id} />}
      {product.productEstimateShipping?.enabled && <EstimateShipping productId={product.id} buildRequest={buildRequest} />}
    </div>
  )
}

/* ---------- reviews ---------- */

function Reviews({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const reviews = useQuery({ queryKey: ['reviews', productId], queryFn: () => api.get<ProductReviewsModel>(`/products/${productId}/reviews`) })
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [additional, setAdditional] = useState<Record<number, number>>({})

  const add = useMutation({
    mutationFn: () =>
      api.post<AddProductReviewResultModel>(`/products/${productId}/reviews`, {
        addProductReview: { title, reviewText: text, rating },
        addAdditionalProductReviewList: Object.entries(additional).map(([reviewTypeId, r]) => ({ reviewTypeId: +reviewTypeId, rating: r })),
      }),
    onSuccess: result => {
      toast(result.message)
      queryClient.setQueryData(['reviews', productId], result.productReviews)
      setTitle('')
      setText('')
    },
  })

  const vote = useMutation({
    mutationFn: ({ reviewId, wasHelpful }: { reviewId: number; wasHelpful: boolean }) =>
      api.post<ReviewHelpfulnessResultModel>(`/products/reviews/${reviewId}/helpfulness`, { wasHelpful }),
    onSuccess: result => {
      toast(result.result, 'info')
      void queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
    },
    onError: error => toast(error.message, 'error'),
  })

  return (
    <QueryView query={reviews}>
      {r => (
        <section id="reviews">
          <h2>Bewertungen ({r.items.length})</h2>
          {r.items.map(item => (
            <div key={item.id} className="review">
              <div className="row space-between">
                <strong>{item.title}</strong>
                <Rating value={item.rating} />
              </div>
              <p>{item.reviewText}</p>
              {item.additionalProductReviewList?.map(a => <div key={a.reviewTypeId} className="small">{a.name}: <Rating value={a.rating} /></div>)}
              {item.replyText && <p className="reply">Antwort des Shops: {item.replyText}</p>}
              <div className="small muted row space-between">
                <span>
                  {item.allowViewingProfiles ? <Link to={`/profile/${item.customerId}`}>{item.customerName}</Link> : item.customerName} · {item.writtenOnStr}
                </span>
                {item.helpfulness && (
                  <span>
                    Hilfreich?{' '}
                    <button className="link" onClick={() => vote.mutate({ reviewId: item.id, wasHelpful: true })}>Ja ({item.helpfulness.helpfulYesTotal})</button>{' '}
                    <button className="link" onClick={() => vote.mutate({ reviewId: item.id, wasHelpful: false })}>Nein ({item.helpfulness.helpfulNoTotal})</button>
                  </span>
                )}
              </div>
            </div>
          ))}

          <form className="card" onSubmit={e => { e.preventDefault(); add.mutate() }}>
            <h3>Bewertung schreiben</h3>
            {r.addProductReview.canCurrentCustomerLeaveReview === false && <Notice kind="warning">Nur registrierte Kunden können Bewertungen schreiben.</Notice>}
            <Field label="Titel" required><input value={title} onChange={e => setTitle(e.target.value)} /></Field>
            <Field label="Text" required><textarea value={text} onChange={e => setText(e.target.value)} /></Field>
            <Field label="Bewertung">
              <select value={rating} onChange={e => setRating(+e.target.value)}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
              </select>
            </Field>
            {r.reviewTypeList?.map(type => (
              <Field key={type.id} label={type.name} required={type.isRequired} hint={type.description}>
                <select value={additional[type.id] ?? ''} onChange={e => setAdditional(a => ({ ...a, [type.id]: +e.target.value }))}>
                  <option value="">---</option>
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                </select>
              </Field>
            ))}
            <ErrorMessage error={add.error} />
            <button className="primary" disabled={add.isPending}>Bewertung absenden</button>
          </form>
        </section>
      )}
    </QueryView>
  )
}

/* ---------- product page ---------- */

function Gallery({ product, overrideUrl }: { product: ProductDetailsModel; overrideUrl: string | null }) {
  const pictures = product.pictureModels?.length ? product.pictureModels : product.defaultPictureModel ? [product.defaultPictureModel] : []
  const [selected, setSelected] = useState(0)
  const main = overrideUrl ?? pictures[selected]?.imageUrl
  return (
    <div className="gallery">
      {main ? (
        <a href={storeUrl(pictures[selected]?.fullSizeImageUrl ?? main)} target="_blank" rel="noreferrer">
          <img src={storeUrl(main)} alt={product.name} className="gallery-main" />
        </a>
      ) : (
        <div className="img-placeholder gallery-main" />
      )}
      {pictures.length > 1 && (
        <div className="thumbs">
          {pictures.map((p, i) => (
            <button key={i} className={i === selected ? 'active' : ''} onClick={() => setSelected(i)}>
              <Img url={p.thumbImageUrl ?? p.imageUrl} alt={p.alternateText ?? ''} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Specifications({ product }: { product: ProductDetailsModel }) {
  const groups = product.productSpecificationModel?.groups?.filter(g => g.attributes.length) ?? []
  if (!groups.length) return null
  return (
    <section>
      <h2>Spezifikationen</h2>
      <table className="table">
        <tbody>
          {groups.map(g => [
            g.name ? <tr key={`g${g.id}`}><th colSpan={2}>{g.name}</th></tr> : null,
            ...g.attributes.map(a => (
              <tr key={`${g.id}-${a.id}`}>
                <td>{a.name}</td>
                <td>
                  {a.values.map((v, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      {v.colorSquaresRgb ? <span className="swatch" style={{ background: v.colorSquaresRgb }} title={v.valueRaw} /> : <span dangerouslySetInnerHTML={{ __html: v.valueRaw }} />}
                    </span>
                  ))}
                </td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </section>
  )
}

function AssociatedProducts({ product }: { product: ProductDetailsModel }) {
  const { addToCart } = useProductActions()
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  if (!product.associatedProducts?.length) return null
  return (
    <section>
      <h2>Varianten</h2>
      {product.associatedProducts.map(p => (
        <div key={p.id} className="card row space-between wrap">
          <div>
            <strong>{p.name}</strong>
            <Html html={p.shortDescription} className="small" />
            {p.stockAvailability && <div className="small">{p.stockAvailability}</div>}
          </div>
          <div className="row">
            <strong>{p.productPrice.price}</strong>
            <input type="number" min={1} className="qty" value={quantities[p.id] ?? 1} onChange={e => setQuantities(q => ({ ...q, [p.id]: +e.target.value }))} />
            {!p.addToCart.disableBuyButton && (
              <button className="primary" onClick={() => addToCart.mutate({ request: { productId: p.id, quantity: quantities[p.id] ?? 1 } })}>In den Warenkorb</button>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

export function ProductPage({ id }: { id: number }) {
  const product = useQuery({ queryKey: ['product', id], queryFn: () => api.get<ProductDetailsModel>(`/products/${id}`) })
  const related = useQuery({ queryKey: ['related', id], queryFn: () => api.get<ProductOverviewModel[]>(`/products/${id}/related`) })
  const alsoPurchased = useQuery({ queryKey: ['also-purchased', id], queryFn: () => api.get<ProductOverviewModel[]>(`/products/${id}/also-purchased`) })
  const filterLevels = useQuery({ queryKey: ['product-fl', id], queryFn: () => api.get<unknown>(`/products/${id}/filter-level-values`), retry: false })
  const [pictureOverride, setPictureOverride] = useState<string | null>(null)

  return (
    <QueryView query={product}>
      {p => (
        <article className="product-page">
          {p.breadcrumb?.enabled && (
            <Breadcrumb items={[...p.breadcrumb.categoryBreadcrumb.map(c => ({ name: c.name, to: `/${c.seName}` })), { name: p.name }]} />
          )}
          <div className="product-top">
            <Gallery product={p} overrideUrl={pictureOverride} />
            <div>
              <h1>{p.name}</h1>
              {p.productReviewOverview?.allowCustomerReviews && (
                <div className="small">
                  {p.productReviewOverview.totalReviews > 0 && <Rating value={p.productReviewOverview.ratingSum / p.productReviewOverview.totalReviews} />}{' '}
                  <a href="#reviews">{p.productReviewOverview.totalReviews} Bewertung(en)</a>
                </div>
              )}
              <Html html={p.shortDescription} className="short-description" />
              {p.displayDiscontinuedMessage && <Notice kind="warning">Dieses Produkt ist nicht mehr erhältlich.</Notice>}
              <BuyBox key={p.id} product={p} onPictureChange={setPictureOverride} />
            </div>
          </div>

          <AssociatedProducts product={p} />

          {p.fullDescription && (
            <section>
              <h2>Beschreibung</h2>
              <Html html={p.fullDescription} className="description" />
            </section>
          )}
          <Specifications product={p} />
          {p.productTags && p.productTags.length > 0 && (
            <section>
              <h3>Tags</h3>
              <div className="tags">{p.productTags.map(t => <Link key={t.id} to={`/producttag/${t.id}/${t.seName}`}>{t.name}</Link>)}</div>
            </section>
          )}
          {filterLevels.data != null && (
            <details>
              <summary>Kompatibilität (Filterebenen, Rohdaten)</summary>
              <pre className="json">{JSON.stringify(filterLevels.data, null, 2)}</pre>
            </details>
          )}
          {p.productReviewOverview?.allowCustomerReviews !== false && <Reviews productId={p.id} />}
          {related.data && related.data.length > 0 && (
            <section>
              <h2>Ähnliche Produkte</h2>
              <ProductGrid products={related.data} />
            </section>
          )}
          {alsoPurchased.data && alsoPurchased.data.length > 0 && (
            <section>
              <h2>Kunden kauften auch</h2>
              <ProductGrid products={alsoPurchased.data} />
            </section>
          )}
        </article>
      )}
    </QueryView>
  )
}

export function ProductEmailAFriendPage() {
  const id = Number(useParams().id)
  const form = useQuery({ queryKey: ['email-a-friend', id], queryFn: () => api.get<EmailAFriendModel>(`/products/${id}/email-a-friend`) })
  return (
    <QueryView query={form}>
      {model => (
        <>
          <h1>Produkt weiterempfehlen</h1>
          <p><Link to={`/${model.productSeName}`}>{model.productName}</Link></p>
          <EmailAFriendForm initial={model} send={values => api.post<EmailAFriendModel>(`/products/${id}/email-a-friend`, values)} />
        </>
      )}
    </QueryView>
  )
}

export function EmailAFriendForm({ initial, send }: { initial: EmailAFriendModel; send: (values: EmailAFriendModel) => Promise<EmailAFriendModel> }) {
  const [values, setValues] = useState(initial)
  const submit = useMutation({ mutationFn: () => send(values) })
  if (submit.data?.successfullySent) return <Notice kind="success">{submit.data.result ?? 'Die E-Mail wurde gesendet.'}</Notice>
  return (
    <form className="card narrow" onSubmit={e => { e.preventDefault(); submit.mutate() }}>
      <Field label="E-Mail des Freundes" required>
        <input type="email" required value={values.friendEmail ?? ''} onChange={e => setValues({ ...values, friendEmail: e.target.value })} />
      </Field>
      <Field label="Ihre E-Mail" required>
        <input type="email" required value={values.yourEmailAddress ?? ''} onChange={e => setValues({ ...values, yourEmailAddress: e.target.value })} />
      </Field>
      <Field label="Persönliche Nachricht">
        <textarea value={values.personalMessage ?? ''} onChange={e => setValues({ ...values, personalMessage: e.target.value })} />
      </Field>
      {submit.data?.result && <Notice kind="warning">{submit.data.result}</Notice>}
      <ErrorMessage error={submit.error} />
      <button className="primary" disabled={submit.isPending}>Senden</button>
    </form>
  )
}
