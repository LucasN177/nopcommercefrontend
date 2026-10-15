import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiError, storeUrl } from '../api/client'
import type { PagerModel, PictureModel, SelectListItem } from '../api/types'

export function Loading({ text = 'Lade …' }: { text?: string }) {
  return <div className="loading">{text}</div>
}

export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  const messages = error instanceof ApiError ? error.messages : [error instanceof Error ? error.message : String(error)]
  const status = error instanceof ApiError ? error.status : undefined
  return (
    <div className="alert alert-error">
      {status && <strong>HTTP {status}: </strong>}
      {messages.length === 1 ? messages[0] : <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>}
    </div>
  )
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'warning' | 'success' | 'error'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>
}

export function Warnings({ warnings }: { warnings?: (string | null | undefined)[] | null }) {
  const list = (warnings ?? []).filter(Boolean)
  if (!list.length) return null
  return (
    <div className="alert alert-warning">
      <ul>{list.map((w, i) => <li key={i}>{w}</li>)}</ul>
    </div>
  )
}

/** Renders loading and error state of a query, then the children with the data. */
export function QueryView<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorMessage error={query.error} />
  return <>{children(query.data)}</>
}

/** HTML from the store (descriptions, topics, attribute info) */
export function Html({ html, className, inline }: { html?: string | null; className?: string; inline?: boolean }) {
  if (!html) return null
  const Tag = inline ? 'span' : 'div'
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function Img({ picture, url, alt, className }: { picture?: PictureModel | null; url?: string | null; alt?: string; className?: string }) {
  const src = storeUrl(url ?? picture?.imageUrl)
  if (!src) return <div className={`img-placeholder ${className ?? ''}`} />
  return <img src={src} alt={alt ?? picture?.alternateText ?? ''} title={picture?.title ?? undefined} className={className} loading="lazy" />
}

export function Rating({ value, max = 5 }: { value: number; max?: number }) {
  const rounded = Math.round(value)
  return (
    <span className="rating" title={`${value.toFixed(1)} / ${max}`}>
      {'★'.repeat(rounded)}
      <span className="rating-empty">{'★'.repeat(Math.max(0, max - rounded))}</span>
    </span>
  )
}

export function Pager({ pager, onPage }: { pager?: PagerModel | null; onPage: (page: number) => void }) {
  if (!pager) return null
  const totalItems = pager.totalItems ?? pager.totalRecords ?? 0
  const totalPages = pager.totalPages ?? (pager.pageSize ? Math.ceil(totalItems / pager.pageSize) : 0)
  const current = pager.pageNumber || (pager.pageIndex ?? 0) + 1
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 2)
  return (
    <nav className="pager">
      <button disabled={current <= 1} onClick={() => onPage(current - 1)}>‹</button>
      {pages.map((p, i) => (
        <span key={p}>
          {i > 0 && pages[i - 1] !== p - 1 && <span className="pager-gap">…</span>}
          <button className={p === current ? 'active' : ''} onClick={() => onPage(p)}>{p}</button>
        </span>
      ))}
      <button disabled={current >= totalPages} onClick={() => onPage(current + 1)}>›</button>
    </nav>
  )
}

export function Field({ label, required, children, hint }: { label: ReactNode; required?: boolean; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Select({ items, value, onChange, placeholder }: { items: SelectListItem[]; value: string | number | null | undefined; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {items.map(item => (
        <option key={item.value} value={item.value} disabled={item.disabled}>{item.text}</option>
      ))}
    </select>
  )
}

export function Breadcrumb({ items }: { items: { name: string; to?: string }[] }) {
  return (
    <nav className="breadcrumb">
      <Link to="/">Start</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="sep">/</span>
          {item.to ? <Link to={item.to}>{item.name}</Link> : <strong>{item.name}</strong>}
        </span>
      ))}
    </nav>
  )
}

export function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

/** ProductOverviewModel has pictureModels (4.60+) or defaultPictureModel (older versions) */
export function firstPicture(product: { pictureModels?: PictureModel[]; defaultPictureModel?: PictureModel }) {
  return product.pictureModels?.[0] ?? product.defaultPictureModel
}
