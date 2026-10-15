import { Link } from 'react-router'
import type { ProductOverviewModel } from '../api/types'
import { useProductActions } from './productActions'
import { firstPicture, Html, Img, Rating } from './ui'

export function ProductCard({ product, list }: { product: ProductOverviewModel; list?: boolean }) {
  const { addToCart, addToWishlist, addToCompare } = useProductActions()
  const price = product.productPrice
  const review = product.reviewOverviewModel
  const request = { productId: product.id, quantity: 1 }

  return (
    <div className={`product-card ${list ? 'list' : ''}`}>
      <Link to={`/${product.seName}`} className="product-card-img">
        <Img picture={firstPicture(product)} alt={product.name} />
        {product.markAsNew && <span className="badge">Neu</span>}
      </Link>
      <div className="product-card-body">
        <Link to={`/${product.seName}`} className="product-card-title">{product.name}</Link>
        {review?.allowCustomerReviews && review.totalReviews > 0 && (
          <div className="small"><Rating value={review.ratingSum / review.totalReviews} /> ({review.totalReviews})</div>
        )}
        {list && <Html html={product.shortDescription} className="small muted" />}
        <div className="price">
          {price?.oldPrice && <s className="old-price">{price.oldPrice}</s>} <strong>{price?.price}</strong>
          {price?.basePricePAngV && <div className="small muted">{price.basePricePAngV}</div>}
        </div>
        <div className="product-card-actions">
          {!price?.disableBuyButton && (
            <button className="primary" disabled={addToCart.isPending} onClick={() => addToCart.mutate({ request, seName: product.seName })}>
              {price?.availableForPreOrder ? 'Vorbestellen' : 'In den Warenkorb'}
            </button>
          )}
          {!price?.disableWishlistButton && (
            <button title="Auf die Wunschliste" onClick={() => addToWishlist.mutate({ request, seName: product.seName })}>♡</button>
          )}
          {!price?.disableAddToCompareListButton && (
            <button title="Vergleichen" onClick={() => addToCompare.mutate(product.id)}>⇄</button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProductGrid({ products, list }: { products?: ProductOverviewModel[] | null; list?: boolean }) {
  if (!products?.length) return null
  return (
    <div className={list ? 'product-list' : 'product-grid'}>
      {products.map(p => <ProductCard key={p.id} product={p} list={list} />)}
    </div>
  )
}
