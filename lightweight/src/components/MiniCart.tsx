import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { api } from '../api/client'
import type { MiniShoppingCartModel } from '../api/types'
import { Html, Img, Loading } from './ui'

export default function MiniCart({ onClose }: { onClose: () => void }) {
  const mini = useQuery({ queryKey: ['cart-mini'], queryFn: () => api.get<MiniShoppingCartModel>('/cart/mini') })
  const m = mini.data

  return (
    <div className="flyout">
      {!m ? (
        <Loading />
      ) : m.totalProducts === 0 ? (
        <p>Ihr Warenkorb ist leer.</p>
      ) : (
        <>
          <p>{m.totalProducts} Artikel im Warenkorb</p>
          <ul className="mini-items">
            {m.items.map(item => (
              <li key={item.id}>
                {m.showProductImages && <Img picture={item.picture} className="thumb-xs" />}
                <div>
                  <Link to={`/${item.productSeName}`} onClick={onClose}>{item.productName}</Link>
                  <Html html={item.attributeInfo} className="small muted" />
                  <div className="small">{item.quantity} × {item.unitPrice}</div>
                </div>
              </li>
            ))}
          </ul>
          <p><strong>Zwischensumme: {m.subTotal}</strong></p>
          <div className="row">
            {m.displayShoppingCartButton && <Link className="button" to="/cart" onClick={onClose}>Zum Warenkorb</Link>}
            {m.displayCheckoutButton && <Link className="button primary" to="/checkout" onClick={onClose}>Zur Kasse</Link>}
          </div>
        </>
      )}
    </div>
  )
}
