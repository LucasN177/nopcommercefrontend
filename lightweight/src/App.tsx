import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import Layout from './components/Layout'
import * as account from './pages/account'
import * as auth from './pages/auth'
import * as cart from './pages/cart'
import * as catalog from './pages/catalog'
import { CheckoutCompletedPage, CheckoutPage } from './pages/checkout'
import * as content from './pages/content'
import * as messages from './pages/messages'
import { ProductEmailAFriendPage } from './pages/product'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/** The paths follow the storefront URLs, so the menu, sitemap and email links of the API work as they are. */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<catalog.HomePage />} />

          {/* catalog */}
          <Route path="search" element={<catalog.SearchPage />} />
          <Route path="newproducts" element={<catalog.NewProductsPage />} />
          <Route path="recentlyviewedproducts" element={<catalog.RecentlyViewedPage />} />
          <Route path="manufacturer/all" element={<catalog.ManufacturerListPage />} />
          <Route path="vendor/all" element={<catalog.VendorListPage />} />
          <Route path="producttag/all" element={<catalog.TagListPage />} />
          <Route path="producttag/:id/:seName?" element={<catalog.TagPage />} />
          <Route path="filterlevelsearch" element={<catalog.FilterLevelSearchPage />} />
          <Route path="productemailafriend/:id" element={<ProductEmailAFriendPage />} />

          {/* cart, wishlist, compare, checkout */}
          <Route path="cart" element={<cart.CartPage />} />
          <Route path="wishlist" element={<cart.WishlistPage />} />
          <Route path="wishlist/:customerGuid" element={<cart.WishlistPage />} />
          <Route path="emailwishlist" element={<cart.WishlistEmailPage />} />
          <Route path="compareproducts" element={<cart.ComparePage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/completed/:orderId?" element={<CheckoutCompletedPage />} />

          {/* login, registration and the pages of email links */}
          <Route path="login" element={<auth.LoginPage />} />
          <Route path="register" element={<auth.RegisterPage />} />
          <Route path="registerresult" element={<auth.RegisterResultPage />} />
          <Route path="passwordrecovery" element={<auth.PasswordRecoveryPage />} />
          <Route path="password-recovery" element={<auth.PasswordRecoveryConfirmPage />} />
          <Route path="account/activation" element={<auth.AccountActivationPage />} />
          <Route path="account/email-revalidation" element={<auth.EmailRevalidationPage />} />
          <Route path="newsletter/activation" element={<auth.NewsletterActivationPage />} />

          {/* content */}
          <Route path="sitemap" element={<content.SitemapPage />} />
          <Route path="contactus" element={<content.ContactUsPage />} />
          <Route path="contactvendor/:vendorId" element={<content.ContactVendorPage />} />
          <Route path="profile/:id" element={<content.ProfilePage />} />
          <Route path="t/:systemName" element={<content.TopicBySystemNamePage />} />
          <Route path="blog" element={<content.BlogListPage />} />
          <Route path="blog/tag/:tag" element={<content.BlogListPage />} />
          <Route path="blog/month/:month" element={<content.BlogListPage />} />
          <Route path="blogpost/:id" element={<content.BlogPostByIdPage />} />

          {/* return requests (also for guests with the withdrawal token) */}
          <Route path="returnrequest/find" element={<account.GuestWithdrawalPage />} />
          <Route path="returnrequest/:orderId" element={<account.ReturnRequestPage />} />

          {/* my account (registered customers) */}
          <Route element={<account.AccountLayout />}>
            <Route path="customer/info" element={<account.CustomerInfoPage />} />
            <Route path="customer/addresses" element={<account.AddressesPage />} />
            <Route path="order/history" element={<account.OrdersPage />} />
            <Route path="account/orders/:orderId" element={<account.OrderDetailsPage />} />
            <Route path="account/shipments/:shipmentId" element={<account.ShipmentPage />} />
            <Route path="returnrequest/history" element={<account.ReturnRequestHistoryPage />} />
            <Route path="customer/downloadableproducts" element={<account.DownloadableProductsPage />} />
            <Route path="backinstocksubscriptions/manage" element={<account.BackInStockSubscriptionsPage />} />
            <Route path="rewardpoints/history" element={<account.RewardPointsPage />} />
            <Route path="customer/changepassword" element={<account.ChangePasswordPage />} />
            <Route path="customer/avatar" element={<account.AvatarPage />} />
            <Route path="customer/productreviews" element={<account.CustomerProductReviewsPage />} />
            <Route path="customer/vendorinfo" element={<account.VendorInfoPage />} />
            <Route path="customer/gdpr" element={<account.GdprPage />} />
            <Route path="customer/checkgiftcardbalance" element={<account.GiftCardBalancePage />} />
            <Route path="recurringpayment/history" element={<account.RecurringPaymentsPage />} />
            <Route path="vendor/apply" element={<account.ApplyVendorPage />} />
            <Route path="privatemessages" element={<messages.PrivateMessagesPage />} />
            <Route path="viewpm/:id" element={<messages.PrivateMessagePage />} />
            <Route path="sendpm/:toCustomerId" element={<messages.SendPrivateMessagePage />} />
          </Route>

          {/* SEO URLs of products, categories, manufacturers, vendors, topics, blog posts */}
          <Route path=":slug" element={<content.SlugPage />} />
          <Route path="*" element={<content.NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
