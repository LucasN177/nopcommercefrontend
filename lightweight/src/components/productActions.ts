import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api, ApiError } from '../api/client'
import { useCartChanged, useWishlistChanged } from '../api/hooks'
import type { CompareProductsModel, ShoppingCartModel, WishlistModel } from '../api/types'
import { useToast } from './Toast'

export interface AddToCartRequest {
  productId: number
  quantity: number
  attributes?: Record<string, string>
  customerEnteredPrice?: number | null
  rentalStartDate?: string | null
  rentalEndDate?: string | null
}

/** Add to cart / wishlist / compare list with toasts and cache updates. */
export function useProductActions() {
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cartChanged = useCartChanged()
  const wishlistChanged = useWishlistChanged()

  const onError = (seName?: string) => (error: Error) => {
    toast(error.message, 'error')
    // e.g. required attributes: the customer has to choose them on the product page
    if (seName && error instanceof ApiError && error.status === 400) navigate(`/${seName}`)
  }

  const addToCart = useMutation({
    mutationFn: ({ request }: { request: AddToCartRequest; seName?: string }) => api.post<ShoppingCartModel>('/cart/items', request),
    onSuccess: cart => {
      cartChanged(cart)
      toast('Das Produkt wurde in den Warenkorb gelegt.')
    },
    onError: (error, { seName }) => onError(seName)(error),
  })

  const addToWishlist = useMutation({
    mutationFn: ({ request }: { request: AddToCartRequest; seName?: string }) => api.post<WishlistModel>('/wishlist/items', request),
    onSuccess: wishlist => {
      wishlistChanged(wishlist)
      toast('Das Produkt wurde auf die Wunschliste gesetzt.')
    },
    onError: (error, { seName }) => onError(seName)(error),
  })

  const addToCompare = useMutation({
    mutationFn: (productId: number) => api.post<CompareProductsModel>(`/compare/${productId}`),
    onSuccess: model => {
      queryClient.setQueryData(['compare'], model)
      toast('Das Produkt wurde zur Vergleichsliste hinzugefügt.')
    },
    onError: error => toast(error.message, 'error'),
  })

  return { addToCart, addToWishlist, addToCompare }
}
