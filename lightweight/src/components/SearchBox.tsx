import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../api/client'
import type { LayoutModel, ProductOverviewModel } from '../api/types'
import { firstPicture, Img } from './ui'

export default function SearchBox({ settings }: { settings?: LayoutModel['searchBox'] }) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [categoryId, setCategoryId] = useState('0')
  const [open, setOpen] = useState(false)
  const minLength = settings?.searchTermMinimumLength ?? 3

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300)
    return () => clearTimeout(timer)
  }, [term])

  const suggestions = useQuery({
    queryKey: ['autocomplete', debounced, categoryId],
    queryFn: () => api.get<ProductOverviewModel[]>('/catalog/search/autocomplete', { term: debounced, categoryId }),
    enabled: !!settings?.autoCompleteEnabled && debounced.length >= minLength,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setOpen(false)
    const params = new URLSearchParams({ q: term.trim() })
    if (categoryId !== '0') params.set('cid', categoryId)
    navigate(`/search?${params}`)
  }

  return (
    <form className="searchbox" onSubmit={submit}>
      {settings?.showSearchBoxCategories && (
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          {settings.availableCategories.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
        </select>
      )}
      <input
        type="search"
        placeholder="Produkte suchen …"
        value={term}
        onChange={e => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      <button type="submit">Suchen</button>
      {open && suggestions.data && suggestions.data.length > 0 && (
        <ul className="autocomplete">
          {suggestions.data.map(p => (
            <li key={p.id}>
              <Link to={`/${p.seName}`} onClick={() => setOpen(false)}>
                {settings?.showProductImagesInSearchAutoComplete && <Img picture={firstPicture(p)} className="thumb-xs" />}
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
