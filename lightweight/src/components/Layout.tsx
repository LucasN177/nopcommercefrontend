import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { api, storeUrl } from '../api/client'
import { useAppContext, useLayout } from '../api/hooks'
import type { ContextModel, MenuItemModel, MenuModel } from '../api/types'
import { useSession } from '../session'
import ApiLog from './ApiLog'
import MiniCart from './MiniCart'
import NewsletterBox from './NewsletterBox'
import SearchBox from './SearchBox'
import { useToast } from './Toast'
import { ErrorMessage, Notice } from './ui'

/** Menu URLs are storefront URLs; the routes of this frontend use the same paths. */
export function menuLink(url: string | null) {
  if (!url) return '/'
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

function MenuItems({ items }: { items: MenuItemModel[] }) {
  return (
    <ul className="menu">
      {items.map(item => (
        <li key={item.id} className={item.childrenItems.length ? 'has-children' : ''}>
          <NavLink to={menuLink(item.url)} end>{item.title}</NavLink>
          {item.childrenItems.length > 0 && <MenuItems items={item.childrenItems} />}
        </li>
      ))}
    </ul>
  )
}

function ContextSelectors() {
  const context = useAppContext()
  const queryClient = useQueryClient()
  const toast = useToast()
  const change = useMutation({
    mutationFn: ({ path, body }: { path: string; body: object }) => api.put<ContextModel>(path, body),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: error => toast(error.message, 'error'),
  })

  if (!context.data) return null
  const c = context.data
  return (
    <div className="selectors">
      {c.availableLanguages.length > 1 && (
        <select value={c.workingLanguage.id} onChange={e => change.mutate({ path: '/context/language', body: { languageId: +e.target.value } })} title="Sprache">
          {c.availableLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      {c.availableCurrencies.length > 1 && (
        <select value={c.workingCurrency.id} onChange={e => change.mutate({ path: '/context/currency', body: { currencyId: +e.target.value } })} title="Währung">
          {c.availableCurrencies.map(cur => <option key={cur.id} value={cur.id}>{cur.name}</option>)}
        </select>
      )}
      {c.allowCustomersToSelectTaxDisplayType && (
        <select value={c.taxDisplayType} onChange={e => change.mutate({ path: '/context/tax-type', body: { taxDisplayType: +e.target.value } })} title="Steueranzeige">
          <option value={0}>inkl. MwSt.</option>
          <option value={10}>exkl. MwSt.</option>
        </select>
      )}
    </div>
  )
}

function HeaderLinks() {
  const layout = useLayout()
  const session = useSession()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const links = layout.data?.headerLinks

  return (
    <nav className="header-links">
      {session.isRegistered ? (
        <>
          <Link to="/customer/info">{links?.customerName || 'Mein Konto'}</Link>
          {links?.allowPrivateMessages && <Link to="/privatemessages">Nachrichten {links.unreadPrivateMessages}</Link>}
          <button className="link" onClick={() => void session.signOut().then(() => navigate('/'))}>Abmelden</button>
        </>
      ) : (
        <>
          <Link to="/register">Registrieren</Link>
          <Link to="/login">Anmelden</Link>
        </>
      )}
      {links?.wishlistEnabled !== false && <Link to="/wishlist">Wunschliste ({links?.wishlistItems ?? 0})</Link>}
      {links?.shoppingCartEnabled !== false && (
        <span className="cart-link" onMouseEnter={() => setCartOpen(true)} onMouseLeave={() => setCartOpen(false)}>
          <Link to="/cart">Warenkorb ({links?.shoppingCartItems ?? 0})</Link>
          {cartOpen && layout.data?.miniShoppingCartEnabled && <MiniCart onClose={() => setCartOpen(false)} />}
        </span>
      )}
    </nav>
  )
}

function CookieWarning() {
  const queryClient = useQueryClient()
  const accept = useMutation({
    mutationFn: () => api.post('/common/eu-cookie-law/accept'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['layout'] }),
  })
  return (
    <div className="cookie-bar">
      <span>Dieser Shop verwendet Cookies (EU-Cookie-Hinweis).</span>
      <button onClick={() => accept.mutate()} disabled={accept.isPending}>OK</button>
    </div>
  )
}

export default function Layout() {
  const layout = useLayout()
  const mainMenu = useQuery({ queryKey: ['menu', 'Main'], queryFn: () => api.get<MenuModel[]>('/common/menus/Main') })
  const footerMenu = useQuery({ queryKey: ['menu', 'Footer'], queryFn: () => api.get<MenuModel[]>('/common/menus/Footer') })
  const l = layout.data

  return (
    <div className="app">
      <div className="topbar">
        <div className="container topbar-inner">
          <ContextSelectors />
          <HeaderLinks />
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            {l?.logo.logoPath ? <img src={storeUrl(l.logo.logoPath)} alt={l.logo.storeName} /> : <span>{l?.logo.storeName ?? 'Shop'}</span>}
          </Link>
          {l?.searchBox.showSearchBox !== false && <SearchBox settings={l?.searchBox} />}
        </div>
        <div className="container">
          {mainMenu.data?.map(menu => <MenuItems key={menu.id} items={menu.items} />)}
        </div>
      </header>

      <main className="container main">
        {layout.isError && <ErrorMessage error={layout.error} />}
        {l?.headerLinks.alertMessage && <Notice kind="warning">{l.headerLinks.alertMessage}</Notice>}
        {l?.storeClosed && <Notice kind={l.canAccessClosedStore ? 'info' : 'error'}>Der Shop ist geschlossen.{l.canAccessClosedStore && ' (Sie haben trotzdem Zugriff.)'}</Notice>}
        {l && !l.navigationAllowed && <Notice kind="warning">Navigation im Shop ist für Sie nicht erlaubt – bitte anmelden.</Notice>}
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          {footerMenu.data?.map(menu => (
            <div key={menu.id} className="footer-col">
              <h4>{menu.name}</h4>
              <ul>
                {menu.items.map(item => <li key={item.id}><Link to={menuLink(item.url)}>{item.title}</Link></li>)}
              </ul>
            </div>
          ))}
          <div className="footer-col">
            <h4>Newsletter</h4>
            <NewsletterBox />
            <div className="social">
              {l &&
                Object.entries(l.social)
                  .filter(([key, value]) => key.endsWith('Link') && typeof value === 'string' && value)
                  .map(([key, value]) => (
                    <a key={key} href={value as string} target="_blank" rel="noreferrer">{key.replace('Link', '')}</a>
                  ))}
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          {l?.footer.storeName} · Test-Frontend für die nopCommerce Headless API
          {l?.footer.displayTaxShippingInfoFooter && <> · Preise {l.taxTypeSelector?.currentTaxType === 0 ? 'inkl.' : 'zzgl.'} MwSt., zzgl. <Link to="/shipping-returns">Versand</Link></>}
        </div>
      </footer>

      {l?.displayEuCookieLawWarning && <CookieWarning />}
      <ApiLog />
    </div>
  )
}
