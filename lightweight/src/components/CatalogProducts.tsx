import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Query } from '../api/client'
import type { CatalogProductsModel } from '../api/types'
import { ProductGrid } from './ProductCard'
import { Notice, Pager } from './ui'

const COMMAND_KEYS = ['pageNumber', 'pageSize', 'orderBy', 'viewMode', 'price', 'specs', 'ms'] as const

/**
 * Paging, sorting and filtering of product lists (CatalogProductsCommand), kept in the URL
 * so the lists can be bookmarked and the browser back button works.
 */
export function useCatalogCommand() {
  const [params, setParams] = useSearchParams()

  const query: Query = {}
  for (const key of COMMAND_KEYS) {
    const values = params.getAll(key)
    if (values.length) query[key] = key === 'specs' || key === 'ms' ? values : values[0]
  }

  function update(changes: Record<string, string | string[] | null>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key)
      if (Array.isArray(value)) value.forEach(v => next.append(key, v))
      else if (value) next.set(key, value)
    }
    if (resetPage && !('pageNumber' in changes)) next.delete('pageNumber')
    setParams(next)
  }

  return { query, params, update }
}

function Filters({ model, command }: { model: CatalogProductsModel; command: ReturnType<typeof useCatalogCommand> }) {
  const selectedPrice = command.params.get('price')?.split('-') ?? []
  const [from, setFrom] = useState(selectedPrice[0] ?? '')
  const [to, setTo] = useState(selectedPrice[1] ?? '')
  const specs = command.params.getAll('specs')
  const ms = command.params.getAll('ms')
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  const { priceRangeFilter, specificationFilter, manufacturerFilter } = model
  if (!priceRangeFilter?.enabled && !specificationFilter?.enabled && !manufacturerFilter?.enabled) return null

  return (
    <aside className="filters">
      {priceRangeFilter?.enabled && (
        <div className="filter-block">
          <h4>Preis</h4>
          <div className="small muted">
            {priceRangeFilter.availablePriceRange.from ?? ''} – {priceRangeFilter.availablePriceRange.to ?? ''}
          </div>
          <form className="row" onSubmit={e => { e.preventDefault(); command.update({ price: from || to ? `${from}-${to}` : null }) }}>
            <input className="qty" placeholder="von" value={from} onChange={e => setFrom(e.target.value)} />
            <input className="qty" placeholder="bis" value={to} onChange={e => setTo(e.target.value)} />
            <button>OK</button>
          </form>
        </div>
      )}
      {specificationFilter?.enabled &&
        specificationFilter.attributes.map(attr => (
          <div key={attr.id} className="filter-block">
            <h4>{attr.name}</h4>
            {attr.values.map(v => (
              <label key={v.id} className="option">
                <input type="checkbox" checked={specs.includes(String(v.id))} onChange={() => command.update({ specs: toggle(specs, String(v.id)) })} />
                {v.colorSquaresRgb && <span className="swatch" style={{ background: v.colorSquaresRgb }} />}
                {v.name}
              </label>
            ))}
          </div>
        ))}
      {manufacturerFilter?.enabled && manufacturerFilter.manufacturers.length > 0 && (
        <div className="filter-block">
          <h4>Hersteller</h4>
          {manufacturerFilter.manufacturers.map(m => {
            const id = 'value' in m ? m.value : String(m.id)
            const name = 'text' in m ? m.text : m.name
            return (
              <label key={id} className="option">
                <input type="checkbox" checked={ms.includes(id)} onChange={() => command.update({ ms: toggle(ms, id) })} />
                {name}
              </label>
            )
          })}
        </div>
      )}
      {(specs.length > 0 || ms.length > 0 || command.params.get('price')) && (
        <button className="link" onClick={() => command.update({ specs: null, ms: null, price: null })}>Filter zurücksetzen</button>
      )}
    </aside>
  )
}

/** Product list with filters, sorting, view mode, page size and paging. */
export default function CatalogProducts({ model, command }: { model?: CatalogProductsModel | null; command: ReturnType<typeof useCatalogCommand> }) {
  if (!model) return null
  const list = (command.params.get('viewMode') ?? model.viewMode) === 'list'

  return (
    <div className="catalog">
      <Filters model={model} command={command} />
      <div className="catalog-main">
        <div className="toolbar">
          {model.allowProductSorting && model.availableSortOptions.length > 0 && (
            <label>
              Sortieren:{' '}
              <select value={command.params.get('orderBy') ?? model.availableSortOptions.find(o => o.selected)?.value ?? ''} onChange={e => command.update({ orderBy: e.target.value })}>
                {model.availableSortOptions.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            </label>
          )}
          {model.allowProductViewModeChanging && model.availableViewModes.length > 0 && (
            <label>
              Ansicht:{' '}
              <select value={list ? 'list' : 'grid'} onChange={e => command.update({ viewMode: e.target.value }, false)}>
                {model.availableViewModes.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            </label>
          )}
          {model.allowCustomersToSelectPageSize && model.pageSizeOptions.length > 0 && (
            <label>
              Anzahl:{' '}
              <select value={command.params.get('pageSize') ?? model.pageSizeOptions.find(o => o.selected)?.value ?? ''} onChange={e => command.update({ pageSize: e.target.value })}>
                {model.pageSizeOptions.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            </label>
          )}
          {model.totalItems ? <span className="muted small">{model.firstItem}–{model.lastItem} von {model.totalItems}</span> : null}
        </div>
        {model.warningMessage && <Notice kind="warning">{model.warningMessage}</Notice>}
        {model.products.length === 0 && <Notice>{model.noResultMessage || 'Keine Produkte gefunden.'}</Notice>}
        <ProductGrid products={model.products} list={list} />
        <Pager pager={model} onPage={page => command.update({ pageNumber: String(page) }, false)} />
      </div>
    </div>
  )
}
