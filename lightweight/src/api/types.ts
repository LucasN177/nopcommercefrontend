// Models of the headless API plugin (see API.md, "Anhang: Modelle des Plugins") and the
// storefront models of nopCommerce (Nop.Web.Models.*) as far as the frontend uses them.
// Storefront fields that are not always filled are optional.

/* ---------- general ---------- */

export interface ProblemDetails {
  type?: string
  title?: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
}

export interface SelectListItem {
  disabled?: boolean
  selected: boolean
  text: string
  value: string
}

export interface PagerModel {
  pageIndex?: number
  pageNumber: number
  pageSize: number
  totalItems?: number
  totalRecords?: number
  totalPages?: number
  firstItem?: number
  lastItem?: number
  hasPreviousPage?: boolean
  hasNextPage?: boolean
  currentPage?: number
  individualPagesDisplayedCount?: number
}

export interface PictureModel {
  imageUrl?: string | null
  thumbImageUrl?: string | null
  fullSizeImageUrl?: string | null
  title?: string | null
  alternateText?: string | null
}

export interface StatusModel {
  apiVersion: string
  nopVersion: string
  storeId: number
  storeName: string
}

/* ---------- auth & context ---------- */

export interface TokenModel {
  accessToken: string
  tokenType: string
  expiresOnUtc: string
  customerGuid: string
  isRegistered: boolean
}

export interface LoginRequest {
  email?: string
  username?: string
  password: string
}

export interface LanguageModel {
  id: number
  name: string
  languageCulture: string
  uniqueSeoCode?: string
  rtl?: boolean
}

export interface CurrencyModel {
  id: number
  name: string
  currencyCode: string
}

export interface ContextCustomerModel {
  customerGuid: string
  isRegistered: boolean
  email: string | null
  username: string | null
  fullName: string
}

/** nopCommerce TaxDisplayType: 0 = including tax, 10 = excluding tax */
export type TaxDisplayType = 0 | 10

export interface ContextModel {
  customer: ContextCustomerModel
  storeId: number
  storeName: string
  workingLanguage: LanguageModel
  workingCurrency: CurrencyModel
  availableLanguages: LanguageModel[]
  availableCurrencies: CurrencyModel[]
  taxDisplayType: TaxDisplayType
  allowCustomersToSelectTaxDisplayType: boolean
}

/* ---------- common ---------- */

export interface LayoutModel {
  logo: { storeName: string; logoPath: string }
  headerLinks: {
    isAuthenticated: boolean
    customerName: string
    shoppingCartEnabled: boolean
    shoppingCartItems: number
    wishlistEnabled: boolean
    wishlistItems: number
    allowPrivateMessages: boolean
    unreadPrivateMessages: string
    alertMessage: string
    registrationType: number
  }
  footer: {
    storeName: string
    hidePoweredByNopCommerce: boolean
    displayTaxShippingInfoFooter: boolean
  }
  social: Record<string, string | number | object>
  faviconAndAppIcons: { headCode: string }
  languageSelector: {
    availableLanguages: { id: number; name: string; flagImageFileName: string }[]
    currentLanguageId: number
    useImages: boolean
  }
  currencySelector: {
    availableCurrencies: { id: number; name: string; currencySymbol: string }[]
    currentCurrencyId: number
  }
  taxTypeSelector: { currentTaxType: TaxDisplayType } | null
  searchBox: {
    autoCompleteEnabled: boolean
    showProductImagesInSearchAutoComplete: boolean
    searchTermMinimumLength: number
    showSearchBox: boolean
    showSearchBoxCategories: boolean
    searchCategoryId: number
    availableCategories: SelectListItem[]
  }
  storeClosed: boolean
  canAccessClosedStore: boolean
  navigationAllowed: boolean
  displayEuCookieLawWarning: boolean
  miniShoppingCartEnabled: boolean
  blogEnabled: boolean
  sitemapEnabled: boolean
  allowCustomersToContactVendors: boolean
}

export interface MenuItemModel {
  id: number
  title: string
  url: string | null
  cssClass: string | null
  menuItemType: number
  entityId: number
  childrenItems: MenuItemModel[]
}

export interface MenuModel {
  id: number
  menuType: number
  name: string
  items: MenuItemModel[]
}

export interface UrlResolveModel {
  entityName: string
  entityId: number
  languageId: number
  redirectToSlug: string | null
}

export interface TopicModel {
  id: number
  systemName: string
  title: string
  body: string
  seName: string
  isPasswordProtected: boolean
}

export interface SitemapModel {
  items: { groupTitle: string; url: string; name: string }[]
  pageModel: PagerModel
}

export interface CountryModel {
  id: number
  name: string
  twoLetterIsoCode: string
  threeLetterIsoCode: string
  allowsBilling: boolean
  allowsShipping: boolean
  subjectToVat: boolean
}

export interface StateProvinceModel {
  id: number
  name: string
}

/* ---------- attributes (product, checkout, customer, address, vendor) ---------- */

/** nopCommerce AttributeControlType */
export const AttributeControlType = {
  DropdownList: 1,
  RadioList: 2,
  Checkboxes: 3,
  TextBox: 4,
  MultilineTextbox: 10,
  Datepicker: 20,
  FileUpload: 30,
  ColorSquares: 40,
  ImageSquares: 45,
  ReadonlyCheckboxes: 50,
} as const

export interface AttributeValueModel {
  id: number
  name: string
  colorSquaresRgb?: string | null
  imageSquaresPictureModel?: PictureModel | null
  priceAdjustment?: string | null
  isPreSelected: boolean
  customerEntersQty?: boolean
  quantity?: number
  pictureId?: number
}

/** common shape of ProductAttributeModel, CheckoutAttributeModel, CustomerAttributeModel, AddressAttributeModel, ... */
export interface AttributeModel {
  id: number
  name: string
  description?: string | null
  textPrompt?: string | null
  isRequired: boolean
  defaultValue?: string | null
  selectedDay?: number | null
  selectedMonth?: number | null
  selectedYear?: number | null
  allowedFileExtensions?: string[]
  attributeControlType: number
  values: AttributeValueModel[]
  hasCondition?: boolean
}

export interface GdprConsentModel {
  id: number
  message: string
  isRequired: boolean
  requiredMessage: string
  accepted: boolean
}

/* ---------- catalog ---------- */

export interface ProductPriceOverview {
  oldPrice?: string | null
  price?: string | null
  basePricePAngV?: string | null
  disableBuyButton?: boolean
  disableWishlistButton?: boolean
  disableAddToCompareListButton?: boolean
  availableForPreOrder?: boolean
  isRental?: boolean
  forceRedirectionAfterAddingToCart?: boolean
  displayTaxShippingInfo?: boolean
}

export interface ProductReviewOverviewModel {
  productId: number
  ratingSum: number
  totalReviews: number
  allowCustomerReviews: boolean
  canAddNewReview?: boolean
}

export interface SpecificationAttributeGroup {
  id: number
  name: string | null
  attributes: { id: number; name: string; values: { attributeTypeId?: number; valueRaw: string; colorSquaresRgb?: string | null }[] }[]
}

export interface ProductSpecificationModel {
  groups: SpecificationAttributeGroup[]
}

export interface ProductOverviewModel {
  id: number
  name: string
  shortDescription?: string | null
  fullDescription?: string | null
  seName: string
  sku?: string | null
  productType?: number
  markAsNew?: boolean
  productPrice?: ProductPriceOverview
  pictureModels?: PictureModel[]
  defaultPictureModel?: PictureModel
  productSpecificationModel?: ProductSpecificationModel
  reviewOverviewModel?: ProductReviewOverviewModel
}

export interface SpecificationFilterModel {
  enabled: boolean
  attributes: { id: number; name: string; values: { id: number; name: string; colorSquaresRgb?: string | null; selected: boolean }[] }[]
}

export interface CatalogProductsModel extends PagerModel {
  warningMessage: string | null
  noResultMessage: string | null
  priceRangeFilter: {
    enabled: boolean
    selectedPriceRange: { from: number | null; to: number | null }
    availablePriceRange: { from: number | null; to: number | null }
  }
  specificationFilter: SpecificationFilterModel
  manufacturerFilter: { enabled: boolean; manufacturers: (SelectListItem | { id: number; name: string; selected: boolean })[] }
  allowProductSorting: boolean
  availableSortOptions: SelectListItem[]
  allowProductViewModeChanging: boolean
  availableViewModes: SelectListItem[]
  allowCustomersToSelectPageSize: boolean
  pageSizeOptions: SelectListItem[]
  orderBy: number | null
  viewMode: string | null
  products: ProductOverviewModel[]
}

export interface CategorySimpleModel {
  id: number
  name: string
  seName: string
  numberOfProducts?: number | null
  subCategories?: CategorySimpleModel[]
  haveSubCategories?: boolean
}

export interface CategoryModel {
  id: number
  name: string
  description?: string | null
  seName: string
  pictureModel?: PictureModel
  displayCategoryBreadcrumb?: boolean
  categoryBreadcrumb?: CategorySimpleModel[]
  subCategories?: { id: number; name: string; seName: string; description?: string | null; pictureModel?: PictureModel }[]
  featuredProducts?: ProductOverviewModel[]
  catalogProductsModel?: CatalogProductsModel
}

export interface ManufacturerModel {
  id: number
  name: string
  description?: string | null
  seName: string
  pictureModel?: PictureModel
  featuredProducts?: ProductOverviewModel[]
  catalogProductsModel?: CatalogProductsModel
}

export interface VendorModel {
  id: number
  name: string
  description?: string | null
  seName: string
  allowCustomersToContactVendors?: boolean
  pictureModel?: PictureModel
  catalogProductsModel?: CatalogProductsModel
}

export interface ProductTagModel {
  id: number
  name: string
  seName: string
  productCount?: number
}

export interface PopularProductTagsModel {
  totalTags: number
  tags: ProductTagModel[]
}

export interface ProductsByTagModel {
  id: number
  tagName: string
  tagSeName: string
  catalogProductsModel: CatalogProductsModel
}

export interface SearchModel {
  q: string | null
  cid: number
  isc: boolean
  mid: number
  vid: number
  sid: boolean
  advs: boolean
  catalogProductsModel: CatalogProductsModel
  availableCategories: SelectListItem[]
  availableManufacturers: SelectListItem[]
  availableVendors: SelectListItem[]
}

export interface CategoryNavigationModel {
  currentCategoryId: number
  categories: CategorySimpleModel[]
}

export interface ManufacturerNavigationModel {
  manufacturers: { id: number; name: string; seName: string; isActive?: boolean }[]
  totalManufacturers: number
}

export interface VendorNavigationModel {
  vendors: { id: number; name: string; seName: string }[]
  totalVendors: number
}

export interface FilterLevelValueItemModel {
  filterLevel1Value: string
  filterLevel2Value: string | null
  filterLevel3Value: string | null
}

export interface FilterLevelValuesModel {
  defaultItemText: string
  values: FilterLevelValueItemModel[]
}

/* ---------- product ---------- */

export interface ProductPriceModel {
  oldPrice?: string | null
  price?: string | null
  priceWithDiscount?: string | null
  basePricePAngV?: string | null
  customerEntersPrice?: boolean
  callForPrice?: boolean
  hidePrices?: boolean
  isRental?: boolean
  rentalPrice?: string | null
  displayTaxShippingInfo?: boolean
  currencyCode?: string
}

export interface AddToCartModel {
  productId: number
  enteredQuantity: number
  minimumQuantityNotification?: string | null
  allowedQuantities: SelectListItem[]
  customerEntersPrice: boolean
  customerEnteredPrice: number
  customerEnteredPriceRange?: string | null
  disableBuyButton: boolean
  disableWishlistButton: boolean
  isRental: boolean
  availableForPreOrder: boolean
  preOrderAvailabilityStartDateTimeUtc?: string | null
}

export interface GiftCardModel {
  isGiftCard: boolean
  recipientName?: string | null
  recipientEmail?: string | null
  senderName?: string | null
  senderEmail?: string | null
  message?: string | null
  giftCardType?: number
}

export interface ProductDetailsModel {
  id: number
  name: string
  shortDescription?: string | null
  fullDescription?: string | null
  seName: string
  productType?: number
  defaultPictureModel?: PictureModel
  pictureModels?: PictureModel[]
  showSku?: boolean
  sku?: string | null
  showManufacturerPartNumber?: boolean
  manufacturerPartNumber?: string | null
  showGtin?: boolean
  gtin?: string | null
  showVendor?: boolean
  vendorModel?: { id: number; name: string; seName: string }
  hasSampleDownload?: boolean
  giftCard?: GiftCardModel
  isShipEnabled?: boolean
  isFreeShipping?: boolean
  deliveryDate?: string | null
  isRental?: boolean
  stockAvailability?: string | null
  displayBackInStockSubscription?: boolean
  emailAFriendEnabled?: boolean
  compareProductsEnabled?: boolean
  productPrice: ProductPriceModel
  addToCart: AddToCartModel
  breadcrumb?: { enabled: boolean; categoryBreadcrumb: CategorySimpleModel[] }
  productTags?: ProductTagModel[]
  productAttributes?: AttributeModel[]
  productSpecificationModel?: ProductSpecificationModel
  productManufacturers?: { id: number; name: string; seName: string }[]
  productReviewOverview?: ProductReviewOverviewModel
  productEstimateShipping?: EstimateShippingModel
  tierPrices?: { price: string; quantity: number }[]
  associatedProducts?: ProductDetailsModel[]
  displayDiscontinuedMessage?: boolean
  inStock?: boolean
}

export interface ProductAttributeChangeModel {
  productId: number
  gtin: string | null
  mpn: string | null
  sku: string | null
  price: string | null
  oldPrice: string | null
  basePricePAngV: string | null
  stockAvailability: string | null
  enabledAttributeMappingIds: number[]
  disabledAttributeMappingIds: number[]
  pictureFullSizeUrl: string | null
  pictureDefaultSizeUrl: string | null
  isFreeShipping: boolean
  messages: string[]
}

export interface ProductReviewItem {
  id: number
  customerId: number
  customerName: string
  customerAvatarUrl?: string | null
  allowViewingProfiles?: boolean
  title: string
  reviewText: string
  replyText?: string | null
  rating: number
  writtenOnStr: string
  helpfulness?: { productReviewId: number; helpfulYesTotal: number; helpfulNoTotal: number }
  additionalProductReviewList?: { reviewTypeId: number; name: string; rating: number }[]
}

export interface ProductReviewsModel {
  productId: number
  productName: string
  productSeName: string
  items: ProductReviewItem[]
  addProductReview: {
    title: string | null
    reviewText: string | null
    rating: number
    canCurrentCustomerLeaveReview?: boolean
    canAddNewReview?: boolean
    successfullyAdded?: boolean
    result?: string | null
  }
  reviewTypeList?: { id: number; name: string; description: string; isRequired: boolean }[]
  addAdditionalProductReviewList?: { reviewTypeId: number; name: string; description?: string; isRequired: boolean; rating: number }[]
}

export interface AddProductReviewResultModel {
  productReviewId: number
  isApproved: boolean
  message: string
  productReviews: ProductReviewsModel
}

export interface ReviewHelpfulnessResultModel {
  productReviewId: number
  result: string
  totalYes: number
  totalNo: number
}

export interface BackInStockSubscribeModel {
  productId: number
  productName: string
  isCurrentCustomerRegistered: boolean
  subscriptionAllowed: boolean
  alreadySubscribed: boolean
  maximumBackInStockSubscriptions?: number
  currentNumberOfBackInStockSubscriptions?: number
}

export interface BackInStockSubscriptionResultModel {
  productId: number
  subscribed: boolean
  message: string
}

export interface EmailAFriendModel {
  productId?: number
  productName?: string
  productSeName?: string
  listId?: number | null
  friendEmail: string | null
  yourEmailAddress: string | null
  personalMessage: string | null
  successfullySent?: boolean
  result?: string | null
}

export interface UploadedFileModel {
  downloadGuid: string
  message: string
}

export interface CompareProductsModel {
  products: ProductOverviewModel[]
  includeShortDescriptionInCompareProducts: boolean
  includeFullDescriptionInCompareProducts: boolean
}

/* ---------- cart & wishlist ---------- */

export interface CartItemModel {
  id: number
  sku?: string | null
  vendorName?: string | null
  picture?: PictureModel
  productId: number
  productName: string
  productSeName: string
  unitPrice: string
  subTotal: string
  discount?: string | null
  maximumDiscountedQty?: number | null
  quantity: number
  allowedQuantities?: SelectListItem[]
  attributeInfo?: string | null
  recurringInfo?: string | null
  rentalInfo?: string | null
  allowItemEditing?: boolean
  disableRemoval?: boolean
  disableAddToCart?: boolean
  warnings: string[]
}

export interface ShoppingCartModel {
  onePageCheckoutEnabled: boolean
  showSku: boolean
  showProductImages: boolean
  isEditable: boolean
  isReadyToCheckout?: boolean
  items: CartItemModel[]
  checkoutAttributes: AttributeModel[]
  warnings: string[]
  minOrderSubtotalWarning: string | null
  displayTaxShippingInfo: boolean
  termsOfServiceOnShoppingCartPage: boolean
  termsOfServiceOnOrderConfirmPage: boolean
  discountBox: {
    appliedDiscountsWithCodes: { id: number; couponCode: string }[]
    display: boolean
    messages: string[]
    isApplied: boolean
  }
  giftCardBox: { display: boolean; message: string | null; isApplied: boolean }
  hideCheckoutButton: boolean
  showVendorName: boolean
  selectedVendorId: number
  availableVendors: { id: number; name: string }[] | SelectListItem[]
  displayVendorList: boolean
}

export interface OrderTotalsModel {
  isEditable: boolean
  subTotal: string | null
  subTotalDiscount: string | null
  shipping: string | null
  requiresShipping: boolean
  selectedShippingMethod: string | null
  hideShippingTotal: boolean
  paymentMethodAdditionalFee: string | null
  tax: string | null
  taxRates: { rate: string; value: string }[]
  displayTax: boolean
  displayTaxRates: boolean
  giftCards: { id: number; couponCode: string; amount: string; remaining: string }[]
  orderTotalDiscount: string | null
  redeemedRewardPoints: number
  redeemedRewardPointsAmount: string | null
  willEarnRewardPoints: number
  orderTotal: string | null
}

export interface MiniShoppingCartModel {
  items: { id: number; productId: number; productName: string; productSeName: string; quantity: number; unitPrice: string; attributeInfo?: string; picture?: PictureModel }[]
  totalProducts: number
  subTotal: string | null
  displayShoppingCartButton: boolean
  displayCheckoutButton: boolean
  currentCustomerIsGuest: boolean
  anonymousCheckoutAllowed: boolean
  showProductImages: boolean
}

export interface EstimateShippingModel {
  enabled: boolean
  countryId: number | null
  stateProvinceId: number | null
  zipPostalCode: string | null
  useCity: boolean
  city: string | null
  availableCountries: SelectListItem[]
  availableStates: SelectListItem[]
}

export interface EstimateShippingResultModel {
  shippingOptions: { name: string; description?: string | null; price: string; deliveryDateFormat?: string | null; selected?: boolean }[]
  success: boolean
  errors: string[]
}

export interface CheckoutAttributesResultModel {
  cart: ShoppingCartModel
  enabledAttributeIds: number[]
  disabledAttributeIds: number[]
  warnings: string[]
}

export interface WishlistModel {
  listId: number | null
  customerGuid: string
  customerFullname: string | null
  emailWishlistEnabled: boolean
  showSku: boolean
  showProductImages: boolean
  isEditable: boolean
  allowMultipleWishlist: boolean
  customWishlistItems: { id: number; name: string }[]
  customWishlistName: string | null
  displayAddToCart: boolean
  displayTaxShippingInfo: boolean
  items: CartItemModel[]
  warnings: string[]
}

export interface AddWishlistItemsToCartResultModel {
  addedItemsCount: number
  warnings: string[]
  message: string | null
  wishlist: WishlistModel
}

/* ---------- addresses & checkout ---------- */

export interface AddressModel {
  id: number
  firstName: string | null
  lastName: string | null
  email: string | null
  companyEnabled: boolean
  companyRequired: boolean
  company: string | null
  countryEnabled: boolean
  countryId: number | null
  countryName: string | null
  stateProvinceEnabled: boolean
  stateProvinceId: number | null
  stateProvinceName: string | null
  countyEnabled: boolean
  countyRequired: boolean
  county: string | null
  cityEnabled: boolean
  cityRequired: boolean
  city: string | null
  streetAddressEnabled: boolean
  streetAddressRequired: boolean
  address1: string | null
  streetAddress2Enabled: boolean
  streetAddress2Required: boolean
  address2: string | null
  zipPostalCodeEnabled: boolean
  zipPostalCodeRequired: boolean
  zipPostalCode: string | null
  phoneEnabled: boolean
  phoneRequired: boolean
  phoneNumber: string | null
  faxEnabled: boolean
  faxRequired: boolean
  faxNumber: string | null
  addressLine?: string | null
  availableCountries: SelectListItem[]
  availableStates: SelectListItem[]
  formattedCustomAddressAttributes: string | null
  customAddressAttributes: AttributeModel[]
}

export interface CustomerAddressListModel {
  addresses: AddressModel[]
}

export interface CheckoutBillingAddressModel {
  existingAddresses: AddressModel[]
  invalidExistingAddresses?: AddressModel[]
  billingNewAddress: AddressModel
  shipToSameAddress: boolean
  shipToSameAddressAllowed: boolean
  newAddressPreselected: boolean
  enteringEmailTwice?: boolean
  vatNumber?: string | null
  euVatEnabled?: boolean
}

export interface PickupPointModel {
  id: string
  name: string
  description?: string | null
  providerSystemName: string
  address?: string | null
  city?: string | null
  countryName?: string | null
  zipPostalCode?: string | null
  pickupFee?: string | null
  openingHours?: string | null
}

export interface PickupPointsModel {
  warnings: string[]
  pickupPoints: PickupPointModel[]
  allowPickupInStore: boolean
  pickupInStore: boolean
  pickupInStoreOnly: boolean
}

export interface CheckoutShippingAddressModel {
  existingAddresses: AddressModel[]
  invalidExistingAddresses?: AddressModel[]
  shippingNewAddress: AddressModel
  newAddressPreselected: boolean
  displayPickupInStore: boolean
  pickupPointsModel: PickupPointsModel
}

export interface CheckoutShippingMethodModel {
  shippingMethods: {
    shippingRateComputationMethodSystemName: string
    name: string
    description?: string | null
    fee: string
    selected: boolean
    shippingOption?: unknown
  }[]
  notifyCustomerAboutShippingFromMultipleLocations?: boolean
  warnings: string[]
  displayPickupInStore?: boolean
  pickupPointsModel?: PickupPointsModel
  allowCustomersToChooseDesiredDeliveryDate?: boolean
}

export interface CheckoutPaymentMethodModel {
  paymentMethods: { paymentMethodSystemName: string; name: string; description?: string | null; fee?: string | null; selected: boolean; logoUrl?: string | null }[]
  displayRewardPoints: boolean
  rewardPointsBalance?: number
  rewardPointsAmount?: string | null
  rewardPointsEnoughToPayForOrder?: boolean
  useRewardPoints?: boolean
}

export interface PaymentInfoModel {
  paymentMethodSystemName: string
  paymentMethodName: string
  paymentMethodType: string
  skipPaymentInfo: boolean
  paymentMethodDescription: string | null
  displayOrderTotals: boolean
}

export interface CheckoutConfirmModel {
  termsOfServiceOnOrderConfirmPage: boolean
  termsOfServicePopup?: boolean
  minOrderTotalWarning: string | null
  warnings: string[]
}

export interface OnePageCheckoutModel {
  shippingRequired: boolean
  disableBillingAddressCheckoutStep: boolean
  billingAddress: CheckoutBillingAddressModel
}

export type CheckoutStepName = 'billing_address' | 'shipping_address' | 'shipping_method' | 'payment_method' | 'payment_info' | 'confirm'

export interface CheckoutStepModel {
  nextStep: CheckoutStepName
  model: unknown
  warnings: string[]
}

export interface PlaceOrderResultModel {
  orderId: number
  customOrderNumber: string
  paymentRedirectUrl: string | null
  completedUrl: string | null
}

export interface CheckoutCompletedModel {
  orderId: number
  customOrderNumber: string
  onePageCheckoutEnabled?: boolean
}

/* ---------- account ---------- */

export interface AccountResultModel {
  message: string
  token: TokenModel | null
}

export interface RegistrationResultModel {
  registrationType: string
  message: string
  token: TokenModel | null
}

export interface NewsLetterSubscriptionModel {
  typeId: number
  name: string
  isActive: boolean
}

/** shared fields of RegisterModel and the storefront CustomerInfoModel */
export interface CustomerFormModel {
  email: string | null
  usernamesEnabled: boolean
  username: string | null
  checkUsernameAvailabilityEnabled: boolean
  genderEnabled: boolean
  neutralGenderEnabled?: boolean
  gender: string | null
  firstNameEnabled: boolean
  firstNameRequired: boolean
  firstName: string | null
  lastNameEnabled: boolean
  lastNameRequired: boolean
  lastName: string | null
  dateOfBirthEnabled: boolean
  dateOfBirthRequired: boolean
  dateOfBirthDay: number | null
  dateOfBirthMonth: number | null
  dateOfBirthYear: number | null
  companyEnabled: boolean
  companyRequired: boolean
  company: string | null
  streetAddressEnabled: boolean
  streetAddressRequired: boolean
  streetAddress: string | null
  streetAddress2Enabled: boolean
  streetAddress2Required: boolean
  streetAddress2: string | null
  zipPostalCodeEnabled: boolean
  zipPostalCodeRequired: boolean
  zipPostalCode: string | null
  cityEnabled: boolean
  cityRequired: boolean
  city: string | null
  countyEnabled: boolean
  countyRequired: boolean
  county: string | null
  countryEnabled: boolean
  countryRequired: boolean
  countryId: number
  availableCountries: SelectListItem[]
  stateProvinceEnabled: boolean
  stateProvinceRequired: boolean
  stateProvinceId: number
  availableStates: SelectListItem[]
  phoneEnabled: boolean
  phoneRequired: boolean
  phone: string | null
  faxEnabled: boolean
  faxRequired: boolean
  fax: string | null
  newsletterEnabled?: boolean
  newsLetterSubscriptions?: NewsLetterSubscriptionModel[]
  timeZoneId: string | null
  allowCustomersToSetTimeZone: boolean
  availableTimeZones: SelectListItem[]
  vatNumber: string | null
  displayVatNumber: boolean
  customerAttributes: AttributeModel[]
  gdprConsents: GdprConsentModel[]
}

export interface RegisterModel extends CustomerFormModel {
  enteringEmailTwice: boolean
  confirmEmail: string | null
  password: string | null
  confirmPassword: string | null
  acceptPrivacyPolicyEnabled: boolean
  acceptPrivacyPolicyPopup: boolean
}

export interface CustomerInfoModel extends CustomerFormModel {
  emailToRevalidate?: string | null
  allowUsersToChangeUsernames?: boolean
  vatNumberStatusNote?: string | null
}

export interface CustomerNavigationModel {
  customerNavigationItems: { routeName: string; title: string; tab: number; itemClass?: string | null }[]
  selectedTab: number
}

export interface CustomerOrderListModel {
  orders: {
    id: number
    customOrderNumber: string
    orderTotal: string
    isReturnRequestAllowed: boolean
    orderStatus: string
    paymentStatus: string
    shippingStatus: string
    createdOn: string
  }[]
  recurringOrders?: unknown[]
}

export interface OrderItemModel {
  id: number
  orderItemGuid: string
  sku?: string | null
  vendorName?: string | null
  picture?: PictureModel
  productId: number
  productName: string
  productSeName: string
  unitPrice: string
  subTotal: string
  quantity: number
  attributeInfo?: string | null
  rentalInfo?: string | null
  downloadId: number
  licenseId: number
}

export interface OrderDetailsModel {
  id: number
  pdfInvoiceDisabled: boolean
  customOrderNumber: string
  createdOn: string
  orderStatus: string
  isReOrderAllowed: boolean
  isReturnRequestAllowed: boolean
  isShippable: boolean
  pickupInStore: boolean
  pickupAddress?: AddressModel
  shippingStatus: string
  shippingAddress: AddressModel
  shippingMethod: string | null
  shipments: { id: number; trackingNumber: string | null; shippedDate: string | null; readyForPickupDate?: string | null; deliveryDate: string | null }[]
  billingAddress: AddressModel
  vatNumber?: string | null
  paymentMethod: string | null
  paymentMethodStatus: string | null
  canRePostProcessPayment: boolean
  canCancelOrder?: boolean
  checkoutAttributeInfo?: string | null
  orderSubtotal: string
  orderSubTotalDiscount?: string | null
  orderShipping?: string | null
  paymentMethodAdditionalFee?: string | null
  tax?: string | null
  displayTax: boolean
  orderTotalDiscount?: string | null
  redeemedRewardPoints?: number
  redeemedRewardPointsAmount?: string | null
  orderTotal: string
  giftCards?: { couponCode: string; amount: string }[]
  showSku: boolean
  items: OrderItemModel[]
  orderNotes: { id: number; hasDownload: boolean; note: string; createdOn: string }[]
}

export interface ShipmentDetailsModel {
  id: number
  trackingNumber: string | null
  trackingNumberUrl?: string | null
  shippedDate: string | null
  readyForPickupDate?: string | null
  deliveryDate: string | null
  shipmentStatusEvents?: { eventName: string; location: string; country: string; date: string | null }[]
  items: { id: number; sku?: string | null; productId: number; productName: string; productSeName: string; attributeInfo?: string | null; quantityOrdered: number; quantityShipped: number }[]
  order: OrderDetailsModel
}

export interface ReorderResultModel {
  warnings: string[]
  message: string | null
}

export interface CustomerRecurringPaymentListModel {
  recurringPayments: {
    id: number
    startDate: string
    cycleInfo: string
    nextPayment: string | null
    totalCycles: number
    cyclesRemaining: number
    initialOrderId: number
    initialOrderNumber: string
    canCancel: boolean
    canRetryLastPayment: boolean
  }[]
  recurringPaymentErrors: string[]
}

export interface CustomerRewardPointsModel {
  rewardPoints: { id?: number; points: number; pointsBalance: string; message: string; createdOn: string; endDate?: string | null }[]
  pagerModel?: PagerModel
  rewardPointsBalance: number
  rewardPointsAmount: string
  minimumRewardPointsBalance?: number
  minimumRewardPointsAmount?: string
}

export interface CustomerReturnRequestsModel {
  items: {
    id: number
    customNumber: string
    returnRequestStatus: string
    productId: number
    productName: string
    productSeName: string
    quantity: number
    returnReason: string
    returnAction: string
    comments: string | null
    uploadedFileGuid: string
    createdOn: string
  }[]
}

export interface SubmitReturnRequestModel {
  orderId: number
  customOrderNumber: string
  items: { id: number; productId: number; productName: string; productSeName: string; attributeInfo?: string | null; unitPrice: string; quantity: number }[]
  returnRequestReasonId: number
  availableReturnReasons: { id: number; name: string }[]
  returnRequestActionId: number
  availableReturnActions: { id: number; name: string }[]
  comments: string | null
  allowFiles: boolean
  result: string | null
}

export interface CustomerDownloadableProductsModel {
  items: {
    orderItemGuid: string
    orderId: number
    customOrderNumber: string
    productId: number
    productName: string
    productSeName: string
    productAttributes?: string | null
    downloadId: number
    licenseId: number
    createdOn: string
  }[]
}

export interface CustomerBackInStockSubscriptionsModel {
  subscriptions: { id: number; productId: number; productName: string; seName: string }[]
  pagerModel?: PagerModel
}

export interface CustomerProductReviewsModel {
  productReviews: {
    productId: number
    productName: string
    productSeName: string
    title: string
    reviewText: string
    replyText?: string | null
    rating: number
    writtenOnStr: string
    approvalStatus: string
  }[]
  pagerModel?: PagerModel
}

export interface PrivateMessageModel {
  id: number
  fromCustomerId: number
  customerFromName: string
  toCustomerId: number
  customerToName: string
  subject: string
  message: string
  createdOn: string
  isRead: boolean
}

export interface PrivateMessageListModel {
  messages: PrivateMessageModel[]
  pagerModel?: PagerModel
}

export interface SendPrivateMessageModel {
  toCustomerId: number
  customerToName?: string
  replyToMessageId?: number | null
  subject: string
  message: string
}

/* ---------- blog & misc ---------- */

export interface BlogPostModel {
  id: number
  seName: string
  title: string
  body: string
  bodyOverview?: string | null
  allowComments: boolean
  preventNotRegisteredUsersToLeaveComments?: boolean
  numberOfComments: number
  createdOn: string
  tags: string[]
  comments: { id: number; customerId: number; customerName: string; customerAvatarUrl?: string | null; commentText: string; createdOn: string }[]
  addNewComment?: { commentText: string | null }
}

export interface BlogPostListModel {
  workingLanguageId: number
  pagingFilteringContext: PagerModel & { month: string | null; tag: string | null }
  blogPosts: BlogPostModel[]
}

export interface ContactUsModel {
  email: string | null
  subject: string | null
  subjectEnabled: boolean
  enquiry: string | null
  fullName: string | null
  successfullySent: boolean
  result: string | null
  contactFormAttributes?: AttributeModel[]
}

export interface ContactVendorModel extends ContactUsModel {
  vendorId: number
  vendorName: string
}

export interface CustomerProfileModel {
  profile: { customerProfileId: number; profileTitle: string }
  info: {
    customerProfileId: number
    avatarUrl?: string | null
    locationEnabled?: boolean
    location?: string | null
    pmEnabled?: boolean
    joinDateEnabled?: boolean
    joinDate?: string | null
    dateOfBirthEnabled?: boolean
    dateOfBirth?: string | null
    totalPostsEnabled?: boolean
    totalPosts?: number
  }
}

export interface VendorFormModel {
  name: string | null
  email: string | null
  description: string | null
  pictureUrl?: string | null
  result?: string | null
  disableFormInput?: boolean
  termsOfServiceEnabled?: boolean
  vendorAttributes?: AttributeModel[]
}
