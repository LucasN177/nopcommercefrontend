import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { api, request } from '../api/client'
import type {
  CatalogProductsModel,
  CategoryModel,
  CategoryNavigationModel,
  CategorySimpleModel,
  FilterLevelValuesModel,
  ManufacturerModel,
  ManufacturerNavigationModel,
  PopularProductTagsModel,
  ProductOverviewModel,
  ProductsByTagModel,
  SearchModel,
  StatusModel,
  VendorModel,
  VendorNavigationModel,
} from '../api/types'
import CatalogProducts, { useCatalogCommand } from '../components/CatalogProducts'
import { ProductGrid } from '../components/ProductCard'
import { Breadcrumb, ErrorMessage, Html, Img, Notice, QueryView } from '../components/ui'

/* ---------- side column ---------- */

function CategoryTree({ categories, currentId }: { categories: CategorySimpleModel[]; currentId: number }) {
  return (
    <ul className="tree">
      {categories.map(c => (
        <li key={c.id} className={c.id === currentId ? 'active' : ''}>
          <Link to={`/${c.seName}`}>{c.name}</Link>
          {c.numberOfProducts != null && <span className="muted small"> ({c.numberOfProducts})</span>}
          {c.subCategories && c.subCategories.length > 0 && <CategoryTree categories={c.subCategories} currentId={currentId} />}
        </li>
      ))}
    </ul>
  )
}

export function SideColumn({ categoryId = 0, productId = 0, manufacturerId = 0 }: { categoryId?: number; productId?: number; manufacturerId?: number }) {
  const categories = useQuery({
    queryKey: ['nav-categories', categoryId, productId],
    queryFn: () => api.get<CategoryNavigationModel>('/catalog/categories/navigation', { currentCategoryId: categoryId, currentProductId: productId }),
  })
  const manufacturers = useQuery({
    queryKey: ['nav-manufacturers', manufacturerId],
    queryFn: () => api.get<ManufacturerNavigationModel>('/catalog/manufacturers/navigation', { currentManufacturerId: manufacturerId }),
    retry: false,
  })
  const vendors = useQuery({ queryKey: ['nav-vendors'], queryFn: () => api.get<VendorNavigationModel>('/catalog/vendors/navigation'), retry: false })
  const tags = useQuery({ queryKey: ['tags'], queryFn: () => api.get<PopularProductTagsModel>('/catalog/tags') })

  return (
    <aside className="side">
      {categories.data && categories.data.categories.length > 0 && (
        <div className="block">
          <h4>Kategorien</h4>
          <CategoryTree categories={categories.data.categories} currentId={categories.data.currentCategoryId} />
        </div>
      )}
      {manufacturers.data && manufacturers.data.manufacturers.length > 0 && (
        <div className="block">
          <h4>Hersteller</h4>
          <ul className="tree">
            {manufacturers.data.manufacturers.map(m => <li key={m.id} className={m.isActive ? 'active' : ''}><Link to={`/${m.seName}`}>{m.name}</Link></li>)}
          </ul>
          {manufacturers.data.totalManufacturers > manufacturers.data.manufacturers.length && <Link to="/manufacturer/all">Alle anzeigen</Link>}
        </div>
      )}
      {vendors.data && vendors.data.vendors.length > 0 && (
        <div className="block">
          <h4>Händler</h4>
          <ul className="tree">{vendors.data.vendors.map(v => <li key={v.id}><Link to={`/${v.seName}`}>{v.name}</Link></li>)}</ul>
          <Link to="/vendor/all">Alle anzeigen</Link>
        </div>
      )}
      {tags.data && tags.data.tags.length > 0 && (
        <div className="block">
          <h4>Beliebte Tags</h4>
          <div className="tags">{tags.data.tags.map(t => <Link key={t.id} to={`/producttag/${t.id}/${t.seName}`}>{t.name}</Link>)}</div>
          <Link to="/producttag/all">Alle anzeigen</Link>
        </div>
      )}
    </aside>
  )
}

/* ---------- home ---------- */

export function HomePage() {
  const status = useQuery({ queryKey: ['status'], queryFn: () => request<StatusModel>('GET', '/status', { auth: false }) })
  const categories = useQuery({ queryKey: ['home-categories'], queryFn: () => api.get<CategoryModel[]>('/catalog/homepage/categories') })
  const products = useQuery({ queryKey: ['home-products'], queryFn: () => api.get<ProductOverviewModel[]>('/catalog/homepage/products') })
  const recent = useQuery({ queryKey: ['recently-viewed'], queryFn: () => api.get<ProductOverviewModel[]>('/products/recently-viewed', { preparePriceModel: true }), retry: false })

  return (
    <div className="with-side">
      <SideColumn />
      <div>
        <section className="hero">
          <h1>Willkommen im Test-Shop</h1>
          {status.data && (
            <p className="muted">
              Verbunden mit <strong>{status.data.storeName}</strong> (Store #{status.data.storeId}) · nopCommerce {status.data.nopVersion} · Headless API {status.data.apiVersion}
            </p>
          )}
          {status.isError && <ErrorMessage error={status.error} />}
        </section>

        {categories.data && categories.data.length > 0 && (
          <section>
            <h2>Kategorien</h2>
            <div className="category-grid">
              {categories.data.map(c => (
                <Link key={c.id} to={`/${c.seName}`} className="category-card">
                  <Img picture={c.pictureModel} alt={c.name} />
                  <span>{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2>Empfohlene Produkte</h2>
          <QueryView query={products}>
            {data => (data.length ? <ProductGrid products={data} /> : <Notice>Keine Produkte für die Startseite markiert.</Notice>)}
          </QueryView>
        </section>

        <FilterLevelSearchBox />

        {recent.data && recent.data.length > 0 && (
          <section>
            <h2>Zuletzt angesehen</h2>
            <ProductGrid products={recent.data} />
          </section>
        )}
      </div>
    </div>
  )
}

/* ---------- category / manufacturer / vendor / tag ---------- */

function SubCategories({ category }: { category: CategoryModel }) {
  if (!category.subCategories?.length) return null
  return (
    <div className="category-grid">
      {category.subCategories.map(c => (
        <Link key={c.id} to={`/${c.seName}`} className="category-card">
          <Img picture={c.pictureModel} alt={c.name} />
          <span>{c.name}</span>
        </Link>
      ))}
    </div>
  )
}

export function CategoryPage({ id }: { id: number }) {
  const command = useCatalogCommand()
  const category = useQuery({
    queryKey: ['category', id, command.query],
    queryFn: () => api.get<CategoryModel>(`/catalog/categories/${id}`, command.query),
    placeholderData: previous => previous,
  })

  return (
    <QueryView query={category}>
      {c => (
        <div className="with-side">
          <SideColumn categoryId={id} />
          <div>
            {c.displayCategoryBreadcrumb !== false && c.categoryBreadcrumb && (
              <Breadcrumb items={c.categoryBreadcrumb.map((b, i, all) => ({ name: b.name, to: i < all.length - 1 ? `/${b.seName}` : undefined }))} />
            )}
            <h1>{c.name}</h1>
            <Html html={c.description} className="description" />
            <SubCategories category={c} />
            {c.featuredProducts && c.featuredProducts.length > 0 && (
              <>
                <h3>Empfohlen</h3>
                <ProductGrid products={c.featuredProducts} />
              </>
            )}
            <CatalogProducts model={c.catalogProductsModel} command={command} />
          </div>
        </div>
      )}
    </QueryView>
  )
}

export function ManufacturerPage({ id }: { id: number }) {
  const command = useCatalogCommand()
  const manufacturer = useQuery({
    queryKey: ['manufacturer', id, command.query],
    queryFn: () => api.get<ManufacturerModel>(`/catalog/manufacturers/${id}`, command.query),
    placeholderData: previous => previous,
  })
  return (
    <QueryView query={manufacturer}>
      {m => (
        <div className="with-side">
          <SideColumn manufacturerId={id} />
          <div>
            <Breadcrumb items={[{ name: 'Hersteller', to: '/manufacturer/all' }, { name: m.name }]} />
            <h1>{m.name}</h1>
            <Html html={m.description} className="description" />
            {m.featuredProducts && m.featuredProducts.length > 0 && <ProductGrid products={m.featuredProducts} />}
            <CatalogProducts model={m.catalogProductsModel} command={command} />
          </div>
        </div>
      )}
    </QueryView>
  )
}

export function VendorPage({ id }: { id: number }) {
  const command = useCatalogCommand()
  const vendor = useQuery({
    queryKey: ['vendor', id, command.query],
    queryFn: () => api.get<VendorModel>(`/catalog/vendors/${id}`, command.query),
    placeholderData: previous => previous,
  })
  const reviews = useQuery({
    queryKey: ['vendor-reviews', id],
    queryFn: () => api.get<{ productReviews?: { items?: unknown[] } } & Record<string, unknown>>(`/catalog/vendors/${id}/reviews`),
    retry: false,
  })
  return (
    <QueryView query={vendor}>
      {v => (
        <div className="with-side">
          <SideColumn />
          <div>
            <Breadcrumb items={[{ name: 'Händler', to: '/vendor/all' }, { name: v.name }]} />
            <div className="row space-between">
              <h1>{v.name}</h1>
              {v.allowCustomersToContactVendors && <Link className="button" to={`/contactvendor/${v.id}`}>Händler kontaktieren</Link>}
            </div>
            <Html html={v.description} className="description" />
            <CatalogProducts model={v.catalogProductsModel} command={command} />
            {reviews.data && (
              <details>
                <summary>Bewertungen der Händlerprodukte (Rohdaten)</summary>
                <pre className="json">{JSON.stringify(reviews.data, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      )}
    </QueryView>
  )
}

export function ManufacturerListPage() {
  const list = useQuery({ queryKey: ['manufacturers'], queryFn: () => api.get<ManufacturerModel[]>('/catalog/manufacturers') })
  return (
    <>
      <h1>Alle Hersteller</h1>
      <QueryView query={list}>
        {data =>
          data.length ? (
            <div className="category-grid">
              {data.map(m => (
                <Link key={m.id} to={`/${m.seName}`} className="category-card">
                  <Img picture={m.pictureModel} alt={m.name} />
                  <span>{m.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <Notice>Keine Hersteller vorhanden.</Notice>
          )
        }
      </QueryView>
    </>
  )
}

export function VendorListPage() {
  const list = useQuery({ queryKey: ['vendors'], queryFn: () => api.get<VendorModel[]>('/catalog/vendors') })
  return (
    <>
      <h1>Alle Händler</h1>
      <QueryView query={list}>
        {data => (
          <div className="category-grid">
            {data.map(v => (
              <Link key={v.id} to={`/${v.seName}`} className="category-card">
                <Img picture={v.pictureModel} alt={v.name} />
                <span>{v.name}</span>
              </Link>
            ))}
          </div>
        )}
      </QueryView>
    </>
  )
}

export function TagListPage() {
  const tags = useQuery({ queryKey: ['tags'], queryFn: () => api.get<PopularProductTagsModel>('/catalog/tags') })
  return (
    <>
      <h1>Produkt-Tags</h1>
      <QueryView query={tags}>
        {data =>
          data.tags.length ? (
            <div className="tags large">
              {data.tags.map(t => <Link key={t.id} to={`/producttag/${t.id}/${t.seName}`}>{t.name} ({t.productCount})</Link>)}
            </div>
          ) : (
            <Notice>Keine Tags vorhanden.</Notice>
          )
        }
      </QueryView>
    </>
  )
}

export function TagPage({ id: idProp }: { id?: number }) {
  const params = useParams()
  const id = idProp ?? Number(params.id)
  const command = useCatalogCommand()
  const tag = useQuery({
    queryKey: ['tag', id, command.query],
    queryFn: () => api.get<ProductsByTagModel>(`/catalog/tags/${id}`, command.query),
    placeholderData: previous => previous,
  })
  return (
    <QueryView query={tag}>
      {t => (
        <>
          <Breadcrumb items={[{ name: 'Tags', to: '/producttag/all' }, { name: t.tagName }]} />
          <h1>Produkte mit Tag „{t.tagName}“</h1>
          <CatalogProducts model={t.catalogProductsModel} command={command} />
        </>
      )}
    </QueryView>
  )
}

export function NewProductsPage() {
  const command = useCatalogCommand()
  const products = useQuery({
    queryKey: ['new-products', command.query],
    queryFn: () => api.get<CatalogProductsModel>('/catalog/new-products', command.query),
    placeholderData: previous => previous,
  })
  return (
    <>
      <h1>Neue Produkte</h1>
      <QueryView query={products}>{model => <CatalogProducts model={model} command={command} />}</QueryView>
    </>
  )
}

export function RecentlyViewedPage() {
  const products = useQuery({
    queryKey: ['recently-viewed'],
    queryFn: () => api.get<ProductOverviewModel[]>('/products/recently-viewed', { preparePriceModel: true }),
  })
  return (
    <>
      <h1>Zuletzt angesehene Produkte</h1>
      <QueryView query={products}>{data => (data.length ? <ProductGrid products={data} /> : <Notice>Noch keine Produkte angesehen.</Notice>)}</QueryView>
    </>
  )
}

/* ---------- search ---------- */

const SEARCH_KEYS = ['q', 'advs', 'cid', 'isc', 'mid', 'vid', 'sid'] as const

export function SearchPage() {
  const command = useCatalogCommand()
  const [params, setParams] = useSearchParams()
  const searchQuery = Object.fromEntries(SEARCH_KEYS.map(k => [k, params.get(k) ?? undefined]))
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(SEARCH_KEYS.map(k => [k, params.get(k) ?? ''])))
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const search = useQuery({
    queryKey: ['search', searchQuery, command.query],
    queryFn: () => api.get<SearchModel>('/catalog/search', { ...searchQuery, ...command.query }),
    placeholderData: previous => previous,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(form)) if (v && v !== 'false' && v !== '0') next.set(k, v)
    setParams(next)
  }

  const s = search.data
  return (
    <>
      <h1>Suche</h1>
      <form className="card search-form" onSubmit={submit}>
        <div className="row">
          <input type="search" placeholder="Suchbegriff" value={form.q} onChange={e => set('q', e.target.value)} />
          <button className="primary">Suchen</button>
        </div>
        <label className="option">
          <input type="checkbox" checked={form.advs === 'true'} onChange={e => set('advs', String(e.target.checked))} /> Erweiterte Suche
        </label>
        {form.advs === 'true' && s && (
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Kategorie</span>
              <select value={form.cid} onChange={e => set('cid', e.target.value)}>
                {s.availableCategories.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            </label>
            <label className="option">
              <input type="checkbox" checked={form.isc === 'true'} onChange={e => set('isc', String(e.target.checked))} /> Unterkategorien einbeziehen
            </label>
            {s.availableManufacturers.length > 0 && (
              <label className="field">
                <span className="field-label">Hersteller</span>
                <select value={form.mid} onChange={e => set('mid', e.target.value)}>
                  {s.availableManufacturers.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
                </select>
              </label>
            )}
            {s.availableVendors.length > 0 && (
              <label className="field">
                <span className="field-label">Händler</span>
                <select value={form.vid} onChange={e => set('vid', e.target.value)}>
                  {s.availableVendors.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
                </select>
              </label>
            )}
            <label className="option">
              <input type="checkbox" checked={form.sid === 'true'} onChange={e => set('sid', String(e.target.checked))} /> In Beschreibungen suchen
            </label>
          </div>
        )}
      </form>
      {search.isError && <ErrorMessage error={search.error} />}
      {s && params.get('q') && <CatalogProducts model={s.catalogProductsModel} command={command} />}
    </>
  )
}

/* ---------- filter levels (e.g. make / model / year) ---------- */

function useFilterLevels(level1: string, level2: string) {
  const l1 = useQuery({ queryKey: ['fl', 1], queryFn: () => api.get<FilterLevelValuesModel>('/catalog/filter-levels/values'), retry: false })
  const l2 = useQuery({
    queryKey: ['fl', 2, level1],
    queryFn: () => api.get<FilterLevelValuesModel>('/catalog/filter-levels/values', { filterLevel1Value: level1 }),
    enabled: !!level1,
  })
  const l3 = useQuery({
    queryKey: ['fl', 3, level1, level2],
    queryFn: () => api.get<FilterLevelValuesModel>('/catalog/filter-levels/values', { filterLevel1Value: level1, filterLevel2Value: level2 }),
    enabled: !!level1 && !!level2,
  })
  return { l1, l2, l3 }
}

function FilterLevelSearchBox() {
  const form = useQuery({ queryKey: ['fl-form'], queryFn: () => api.get<Record<string, unknown>>('/catalog/filter-levels/search-form'), retry: false })
  if (!form.data) return null
  return (
    <section className="card">
      <h2>Teilesuche nach Filterebenen</h2>
      <Link to="/filterlevelsearch" className="button">Zur Filterebenen-Suche</Link>
    </section>
  )
}

export function FilterLevelSearchPage() {
  const command = useCatalogCommand()
  const [level1, setLevel1] = useState('')
  const [level2, setLevel2] = useState('')
  const [level3, setLevel3] = useState('')
  const { l1, l2, l3 } = useFilterLevels(level1, level2)
  const [params] = useSearchParams()
  const searchParams = { fl1id: params.get('fl1id') ?? undefined, fl2id: params.get('fl2id') ?? undefined, fl3id: params.get('fl3id') ?? undefined }
  const result = useQuery({
    queryKey: ['fl-search', searchParams, command.query],
    queryFn: () => api.get<Record<string, unknown> & { catalogProductsModel?: CatalogProductsModel }>('/catalog/filter-levels/search', { ...searchParams, ...command.query }),
    retry: false,
  })

  const unique = (values: (string | null)[]) => [...new Set(values.filter(Boolean) as string[])]

  return (
    <>
      <h1>Suche nach Filterebenen</h1>
      {l1.isError ? (
        <ErrorMessage error={l1.error} />
      ) : (
        <div className="card row">
          <select value={level1} onChange={e => { setLevel1(e.target.value); setLevel2(''); setLevel3('') }}>
            <option value="">{l1.data?.defaultItemText ?? 'Ebene 1'}</option>
            {unique(l1.data?.values.map(v => v.filterLevel1Value) ?? []).map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={level2} disabled={!level1} onChange={e => { setLevel2(e.target.value); setLevel3('') }}>
            <option value="">{l2.data?.defaultItemText ?? 'Ebene 2'}</option>
            {unique(l2.data?.values.map(v => v.filterLevel2Value) ?? []).map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={level3} disabled={!level2} onChange={e => setLevel3(e.target.value)}>
            <option value="">{l3.data?.defaultItemText ?? 'Ebene 3'}</option>
            {unique(l3.data?.values.map(v => v.filterLevel3Value) ?? []).map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      )}
      <p className="small muted">
        Die Suche selbst erwartet die IDs der Filterwerte als <code>fl1id</code>, <code>fl2id</code>, <code>fl3id</code> in der URL.
      </p>
      {result.isError && <ErrorMessage error={result.error} />}
      {result.data?.catalogProductsModel && <CatalogProducts model={result.data.catalogProductsModel} command={command} />}
    </>
  )
}
