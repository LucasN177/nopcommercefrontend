import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { ContextModel, CountryModel, LayoutModel, ShoppingCartModel, StateProvinceModel, WishlistModel } from './types'

export function useLayout() {
  return useQuery({ queryKey: ['layout'], queryFn: () => api.get<LayoutModel>('/common/layout') })
}

export function useAppContext() {
  return useQuery({ queryKey: ['context'], queryFn: () => api.get<ContextModel>('/context') })
}

/** CountryAddressType: 0 = all, 10 = billing, 20 = shipping */
export function useCountries(type = 0) {
  return useQuery({
    queryKey: ['countries', type],
    queryFn: () => api.get<CountryModel[]>('/countries', { type }),
    staleTime: Infinity,
  })
}

export function useStates(countryId: number | null | undefined) {
  return useQuery({
    queryKey: ['states', countryId],
    queryFn: () => api.get<StateProvinceModel[]>(`/countries/${countryId}/states`, { addSelectStateItem: true }),
    enabled: !!countryId,
    staleTime: Infinity,
  })
}

/** Stores a cart returned by a changing endpoint and refreshes everything derived from it. */
export function useCartChanged() {
  const queryClient = useQueryClient()
  return (cart?: ShoppingCartModel) => {
    if (cart) queryClient.setQueryData(['cart'], cart)
    else void queryClient.invalidateQueries({ queryKey: ['cart'] })
    void queryClient.invalidateQueries({ queryKey: ['cart-totals'] })
    void queryClient.invalidateQueries({ queryKey: ['cart-mini'] })
    void queryClient.invalidateQueries({ queryKey: ['layout'] })
  }
}

/** Stores a wishlist returned by a changing endpoint and refreshes the header counter. */
export function useWishlistChanged() {
  const queryClient = useQueryClient()
  return (wishlist?: WishlistModel) => {
    if (wishlist) queryClient.setQueryData(['wishlist', wishlist.listId ?? null], wishlist)
    void queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    void queryClient.invalidateQueries({ queryKey: ['layout'] })
  }
}
