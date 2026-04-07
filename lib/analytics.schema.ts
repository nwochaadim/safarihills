export const ANALYTICS_EVENTS = {
  AppOpened: 'app_opened',
  ScreenView: 'screen_view',
  Login: 'login',
  SignUp: 'sign_up',
  GuestIdentified: 'guest_identified',
  Logout: 'logout',
  SearchFiltersApplied: 'search_filters_applied',
  ExploreSectionSelect: 'explore_section_select',
  ListingListView: 'listing_list_view',
  ViewItemList: 'view_item_list',
  SelectItem: 'select_item',
  ViewItem: 'view_item',
  ViewPromotion: 'view_promotion',
  SelectPromotion: 'select_promotion',
  ListingGalleryBrowse: 'listing_gallery_browse',
  ListingContentMilestone: 'listing_content_milestone',
  AttractionSelect: 'attraction_select',
  BeginBooking: 'begin_booking',
  ApartmentTypeSelect: 'apartment_type_select',
  BookingDetailsCompleted: 'booking_details_completed',
  ReviewAndPayClick: 'review_and_pay_click',
  BookingAbandon: 'booking_abandon',
  BookingSummaryView: 'booking_summary_view',
  CouponApply: 'coupon_apply',
  BookingPaymentMethodSelect: 'booking_payment_method_select',
  BookingPaymentAttempt: 'booking_payment_attempt',
  Purchase: 'purchase',
  BookingPaymentFailure: 'booking_payment_failure',
  BookingsAction: 'bookings_action',
  ProfileAction: 'profile_action',
  SupportContactSelect: 'support_contact_select',
  WalletTopupInitiated: 'wallet_topup_initiated',
  WalletTopupSuccess: 'wallet_topup_success',
  WalletTopupFailure: 'wallet_topup_failure',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsActorType = 'user' | 'guest';
export type AnalyticsAuthState = 'signed_in' | 'guest';
export type AnalyticsLeadTemperature = 'cold' | 'warm' | 'hot';
export type BookingMode = 'standard' | 'offer';
export type AnalyticsScreenGroup =
  | 'auth'
  | 'discovery'
  | 'listing'
  | 'booking'
  | 'offers'
  | 'profile'
  | 'support'
  | 'system';

export type AnalyticsContextParams = {
  actor_type: AnalyticsActorType;
  analytics_actor_id: string;
  auth_state: AnalyticsAuthState;
  session_id: string;
};

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  price?: number;
  quantity?: number;
  promotion_id?: string;
  promotion_name?: string;
  item_list_id?: string;
  item_list_name?: string;
};

export type AnalyticsUserProperties = {
  actor_type?: AnalyticsActorType;
  auth_state?: AnalyticsAuthState;
  user_tier?: string;
  lead_temperature?: AnalyticsLeadTemperature;
  wallet_balance_bucket?: string;
  referral_count_bucket?: string;
};

type AppOpenedParams = {
  landing_route: string;
  landing_screen: string;
  screen_group: AnalyticsScreenGroup;
};

type ScreenViewParams = {
  screen_name: string;
  screen_class: string;
  route_key: string;
  screen_group: AnalyticsScreenGroup;
};

type AuthEventParams = {
  method: string;
  source_screen?: string;
  source_surface?: string;
};

type SearchFiltersAppliedParams = {
  source_screen: string;
  source_surface: string;
  filter_count: number;
  location?: string;
  apartment_type?: string;
  guest_count?: number;
  min_budget?: number;
  max_budget?: number;
  has_dates: number;
  has_budget: number;
  amenities_count: number;
};

type ExploreSectionSelectParams = {
  source_screen: string;
  source_surface: string;
  section_id?: string;
  section_slug: string;
  section_title: string;
  section_type: string;
  matching_count: number;
  city?: string;
  filter_count?: number;
};

type ListingListViewParams = {
  list_id: string;
  list_name: string;
  source_screen: string;
  source_surface: string;
  source_section?: string;
  city?: string;
  list_size: number;
  matching_count?: number;
  filter_count?: number;
};

type ViewItemListParams = {
  item_list_id: string;
  item_list_name: string;
  source_screen: string;
  source_surface: string;
  source_section?: string;
  city?: string;
  list_size: number;
  items?: AnalyticsItem[];
};

type SelectItemParams = {
  source_screen: string;
  source_surface: string;
  source_section?: string;
  item_list_id?: string;
  item_list_name?: string;
  listing_id: string;
  listing_name: string;
  city?: string;
  apartment_type?: string;
  price?: number;
  has_offer: number;
  items?: AnalyticsItem[];
};

type ViewItemParams = {
  currency: 'NGN';
  value?: number;
  source_screen?: string;
  source_surface?: string;
  source_section?: string;
  listing_id: string;
  listing_name: string;
  city?: string;
  apartment_type?: string;
  price?: number;
  has_reviews: number;
  has_attractions: number;
  image_count: number;
  offer_count: number;
  items?: AnalyticsItem[];
};

type PromotionParams = {
  promotion_id: string;
  promotion_name: string;
  source_screen: string;
  source_surface: string;
  listing_id?: string;
  listing_name?: string;
  city?: string;
  offer_type?: string;
  savings_label?: string;
};

type ListingGalleryBrowseParams = {
  listing_id: string;
  source_surface: 'hero_carousel' | 'photo_modal';
  image_index: number;
  image_count: number;
  browse_depth: 'started' | 'deep' | 'complete';
};

type ListingContentMilestoneParams = {
  listing_id: string;
  milestone: 'reviews_visible' | 'attractions_visible';
  city?: string;
};

type AttractionSelectParams = {
  source_screen: string;
  listing_id: string;
  attraction_id: string;
  attraction_name: string;
  city?: string;
};

type BookingBaseParams = {
  booking_mode: BookingMode;
  source_screen: string;
  source_surface?: string;
  source_section?: string;
  listing_id: string;
  listing_name?: string;
  city?: string;
  apartment_type?: string;
  offer_id?: string;
  offer_name?: string;
};

type BeginBookingParams = BookingBaseParams & {
  offer_selected: number;
  auth_gate_state?: AnalyticsAuthState;
  has_reviews?: number;
  has_attractions?: number;
  value?: number;
  currency?: 'NGN';
};

type ApartmentTypeSelectParams = BookingBaseParams & {
  selected_apartment_type: string;
  previous_apartment_type?: string;
};

type BookingDetailsCompletedParams = BookingBaseParams & {
  guest_count: number;
  nights?: number;
  stay_units: number;
  stay_unit_type: 'nights' | 'time_slot';
  booking_value: number;
  booking_value_bucket: string;
  currency: 'NGN';
};

type ReviewAndPayClickParams = BookingDetailsCompletedParams & {
  booking_reference: string;
  coupon_code_present: number;
};

type BookingAbandonParams = BookingBaseParams & {
  abandon_stage:
    | 'details_started'
    | 'dates_selected'
    | 'time_selected'
    | 'purpose_selected'
    | 'summary_view'
    | 'payment_pending';
  booking_reference?: string;
  booking_value_bucket?: string;
};

type BookingSummaryViewParams = BookingBaseParams & {
  booking_id: string;
  booking_reference: string;
  guest_count: number;
  nights?: number;
  booking_value: number;
  booking_value_bucket: string;
  currency: 'NGN';
  coupon_code_present: number;
  payment_state?: string;
};

type CouponApplyParams = BookingBaseParams & {
  booking_id: string;
  booking_reference: string;
  result: 'attempt' | 'success' | 'failure';
  booking_value_bucket: string;
  discount_value?: number;
  failure_reason?: string;
  coupon_code_present: number;
};

type BookingPaymentMethodSelectParams = BookingBaseParams & {
  booking_id: string;
  booking_reference: string;
  payment_method: 'paystack' | 'wallet';
  booking_value_bucket: string;
  wallet_balance_bucket?: string;
};

type BookingPaymentAttemptParams = BookingBaseParams & {
  booking_id: string;
  booking_reference: string;
  payment_method: 'paystack' | 'wallet';
  booking_value: number;
  booking_value_bucket: string;
  currency: 'NGN';
};

type PurchaseParams = BookingBaseParams & {
  transaction_id: string;
  booking_id: string;
  booking_reference: string;
  payment_method: 'paystack' | 'wallet';
  value: number;
  booking_value_bucket: string;
  currency: 'NGN';
  coupon_applied: number;
  guest_count?: number;
  nights?: number;
  items?: AnalyticsItem[];
};

type BookingPaymentFailureParams = BookingBaseParams & {
  booking_id: string;
  booking_reference: string;
  payment_method: 'paystack' | 'wallet';
  booking_value_bucket: string;
  failure_reason: string;
};

type BookingsActionParams = {
  action:
    | 'filter_change'
    | 'booking_card_open'
    | 'reservation_open'
    | 'reference_copy'
    | 'contact_call'
    | 'delete_attempt'
    | 'delete_success'
    | 'delete_failure';
  source_screen: string;
  booking_id?: string;
  booking_reference?: string;
  booking_state?: string;
  filter_value?: string;
  city?: string;
};

type ProfileActionParams = {
  action:
    | 'open_personal_details'
    | 'open_wallet'
    | 'open_rewards'
    | 'open_referrals'
    | 'copy_referral_code'
    | 'share_referral_code'
    | 'open_help'
    | 'open_faqs'
    | 'open_terms'
    | 'open_transactions'
    | 'update_personal_details';
  source_screen: string;
  changed_fields_count?: number;
};

type SupportContactSelectParams = {
  source_screen: string;
  channel: 'phone' | 'email' | 'instagram' | 'tiktok';
};

type WalletTopupParams = {
  source_screen: string;
  amount?: number;
  amount_bucket?: string;
  payment_provider: 'paystack';
  failure_reason?: string;
};

type GuestIdentifiedParams = {
  guest_actor_id: string;
  user_id: string;
  method: string;
  source_screen?: string;
};

type LogoutParams = {
  source_screen?: string;
  reason?: string;
};

export type AnalyticsEventParamsMap = {
  app_opened: AppOpenedParams;
  screen_view: ScreenViewParams;
  login: AuthEventParams;
  sign_up: AuthEventParams;
  guest_identified: GuestIdentifiedParams;
  logout: LogoutParams;
  search_filters_applied: SearchFiltersAppliedParams;
  explore_section_select: ExploreSectionSelectParams;
  listing_list_view: ListingListViewParams;
  view_item_list: ViewItemListParams;
  select_item: SelectItemParams;
  view_item: ViewItemParams;
  view_promotion: PromotionParams;
  select_promotion: PromotionParams;
  listing_gallery_browse: ListingGalleryBrowseParams;
  listing_content_milestone: ListingContentMilestoneParams;
  attraction_select: AttractionSelectParams;
  begin_booking: BeginBookingParams;
  apartment_type_select: ApartmentTypeSelectParams;
  booking_details_completed: BookingDetailsCompletedParams;
  review_and_pay_click: ReviewAndPayClickParams;
  booking_abandon: BookingAbandonParams;
  booking_summary_view: BookingSummaryViewParams;
  coupon_apply: CouponApplyParams;
  booking_payment_method_select: BookingPaymentMethodSelectParams;
  booking_payment_attempt: BookingPaymentAttemptParams;
  purchase: PurchaseParams;
  booking_payment_failure: BookingPaymentFailureParams;
  bookings_action: BookingsActionParams;
  profile_action: ProfileActionParams;
  support_contact_select: SupportContactSelectParams;
  wallet_topup_initiated: WalletTopupParams;
  wallet_topup_success: WalletTopupParams;
  wallet_topup_failure: WalletTopupParams;
};

export type AnalyticsEventParams<TEventName extends AnalyticsEventName> =
  AnalyticsEventParamsMap[TEventName];

export const toFlag = (value: boolean) => (value ? 1 : 0);

export const toBucket = (
  value: number,
  thresholds: Array<{ max: number; label: string }>,
  fallback = 'high'
) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const match = thresholds.find((threshold) => safeValue <= threshold.max);
  return match?.label ?? fallback;
};

export const getBookingValueBucket = (value: number) =>
  toBucket(
    value,
    [
      { max: 50000, label: '0_50k' },
      { max: 100000, label: '50k_100k' },
      { max: 200000, label: '100k_200k' },
      { max: 400000, label: '200k_400k' },
      { max: 800000, label: '400k_800k' },
    ],
    '800k_plus'
  );

export const getWalletBalanceBucket = (value: number) =>
  toBucket(
    value,
    [
      { max: 0, label: '0' },
      { max: 50000, label: '0_50k' },
      { max: 100000, label: '50k_100k' },
      { max: 250000, label: '100k_250k' },
      { max: 500000, label: '250k_500k' },
    ],
    '500k_plus'
  );

export const getReferralCountBucket = (value: number) =>
  toBucket(
    value,
    [
      { max: 0, label: '0' },
      { max: 1, label: '1' },
      { max: 3, label: '2_3' },
      { max: 5, label: '4_5' },
      { max: 10, label: '6_10' },
    ],
    '10_plus'
  );

export const buildListingAnalyticsItem = (input: {
  id: string;
  name: string;
  apartmentType?: string | null;
  city?: string | null;
  price?: number | null;
  itemListId?: string;
  itemListName?: string;
  promotionId?: string;
  promotionName?: string;
}): AnalyticsItem => ({
  item_id: input.id,
  item_name: input.name,
  item_category: input.apartmentType?.trim() || undefined,
  item_category2: input.city?.trim() || undefined,
  price:
    typeof input.price === 'number' && Number.isFinite(input.price)
      ? input.price
      : undefined,
  item_list_id: input.itemListId,
  item_list_name: input.itemListName,
  promotion_id: input.promotionId,
  promotion_name: input.promotionName,
});

const WARM_INTENT_EVENTS: AnalyticsEventName[] = [
  ANALYTICS_EVENTS.SearchFiltersApplied,
  ANALYTICS_EVENTS.ExploreSectionSelect,
  ANALYTICS_EVENTS.ListingListView,
  ANALYTICS_EVENTS.ViewItemList,
  ANALYTICS_EVENTS.SelectItem,
  ANALYTICS_EVENTS.ViewItem,
  ANALYTICS_EVENTS.ViewPromotion,
  ANALYTICS_EVENTS.SelectPromotion,
  ANALYTICS_EVENTS.ListingGalleryBrowse,
  ANALYTICS_EVENTS.ListingContentMilestone,
  ANALYTICS_EVENTS.AttractionSelect,
  ANALYTICS_EVENTS.ProfileAction,
  ANALYTICS_EVENTS.BookingsAction,
];

const HOT_INTENT_EVENTS: AnalyticsEventName[] = [
  ANALYTICS_EVENTS.BeginBooking,
  ANALYTICS_EVENTS.ApartmentTypeSelect,
  ANALYTICS_EVENTS.BookingDetailsCompleted,
  ANALYTICS_EVENTS.ReviewAndPayClick,
  ANALYTICS_EVENTS.BookingSummaryView,
  ANALYTICS_EVENTS.CouponApply,
  ANALYTICS_EVENTS.BookingPaymentMethodSelect,
  ANALYTICS_EVENTS.BookingPaymentAttempt,
  ANALYTICS_EVENTS.Purchase,
  ANALYTICS_EVENTS.WalletTopupInitiated,
  ANALYTICS_EVENTS.WalletTopupSuccess,
];

export const getLeadTemperatureForEvent = (
  eventName: AnalyticsEventName
): AnalyticsLeadTemperature | null => {
  if (HOT_INTENT_EVENTS.includes(eventName)) {
    return 'hot';
  }
  if (WARM_INTENT_EVENTS.includes(eventName)) {
    return 'warm';
  }
  return null;
};
