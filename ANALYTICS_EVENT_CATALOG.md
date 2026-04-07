# Analytics Event Catalog

This document is the single source of truth for the Firebase Analytics instrumentation added to the React Native app.

## A. Instrumentation Plan

1. Initialize analytics once in a central provider and attach a stable identity context before major tracking begins.
2. Use manual `screen_view` tracking so route names stay consistent across Expo Router and React Native.
3. Keep the schema typed in `lib/analytics.schema.ts` and route all logging through `lib/analytics.ts`.
4. Prefer GA4-recommended events where semantics already exist: `screen_view`, `login`, `sign_up`, `view_item_list`, `select_item`, `view_item`, `view_promotion`, `select_promotion`, `begin_booking`, `purchase`.
5. Use a small set of custom events only where the domain needs more detail: filters, gallery engagement, listing content milestones, booking completion steps, abandon points, wallet actions, profile actions.
6. Propagate `source_screen`, `source_surface`, `source_section`, item list context, listing context, offer context, and booking value buckets through the full discovery-to-booking funnel.
7. Deduplicate noisy interactions with `trackOnce(...)` for scroll milestones and gallery depth milestones.

## B. Naming Convention

- Event names use stable `snake_case`.
- Use one event with an `action` or `result` param instead of many near-duplicate event names.
- Prefer low-cardinality params and value buckets for segmentation-friendly BigQuery models.
- Avoid sensitive personal data. Real app `user_id` is used only through Firebase `setUserId(...)` and the auto-attached `analytics_actor_id` identity field.

## C. Taxonomy By Funnel Stage

### Lifecycle and identity

- `app_opened`
- `screen_view`
- `login`
- `sign_up`
- `guest_identified`
- `logout`

### Discovery and evaluation

- `search_filters_applied`
- `explore_section_select`
- `listing_list_view`
- `view_item_list`
- `select_item`
- `view_item`
- `view_promotion`
- `select_promotion`
- `listing_gallery_browse`
- `listing_content_milestone`
- `attraction_select`

### Booking funnel

- `begin_booking`
- `apartment_type_select`
- `booking_details_completed`
- `review_and_pay_click`
- `booking_abandon`
- `booking_summary_view`
- `coupon_apply`
- `booking_payment_method_select`
- `booking_payment_attempt`
- `purchase`
- `booking_payment_failure`

### Retention and account value

- `bookings_action`
- `profile_action`
- `support_contact_select`
- `wallet_topup_initiated`
- `wallet_topup_success`
- `wallet_topup_failure`

## D. Identity and Session Model

Every event is automatically enriched in `lib/analytics.ts` with:

- `actor_type`: `user | guest`
- `analytics_actor_id`
- `auth_state`: `signed_in | guest`
- `session_id`

Rules implemented:

- Signed-in users call `setUserId(real_user_id)` and all future events use `actor_type = user`.
- Guests use `analytics_actor_id = guest_{session_id}` and `actor_type = guest`.
- `guest_identified` is logged when a guest authenticates and is stitched to the resolved user id.
- `logout` clears the Firebase user id and starts a fresh guest session.
- Unauthorized session expiry also clears authenticated identity centrally via `lib/apolloClient.ts`.

Assumption:

- A guest session is treated as the current app session or the post-logout browse period. That keeps anonymous attribution stable within a session while still producing clear session boundaries for funnel analysis.

## E. User Properties

| user_property | Values | Why it matters |
| --- | --- | --- |
| `actor_type` | `user`, `guest` | Segment known users from anonymous demand. |
| `auth_state` | `signed_in`, `guest` | Build funnels split by authentication state. |
| `lead_temperature` | `cold`, `warm`, `hot` | Create lifecycle audiences from meaningful intent progression. |
| `user_tier` | backend tier string | Compare monetization and retention across customer tiers. |
| `wallet_balance_bucket` | low-cardinality NGN bucket | Useful for payment propensity and top-up campaigns. |
| `referral_count_bucket` | low-cardinality count bucket | Useful for advocacy and referral segmentation. |

Lead temperature is promoted centrally:

- `warm`: discovery and evaluation behaviour such as filters, list views, listing views, promotion views, gallery browsing, profile/bookings engagement.
- `hot`: explicit commercial intent such as booking start, booking completion, payment selection, payment attempt, purchase, and wallet top-up.

## F. Screen / Component Mapping

| File | Main analytics responsibility |
| --- | --- |
| `components/AnalyticsProvider.tsx` | App-open event, manual `screen_view`, analytics context subscription. |
| `lib/analytics.ts` | Identity lifecycle, event enrichment, Firebase bridge, user properties, screen tracking helpers. |
| `lib/analytics.schema.ts` | Typed event names, param contracts, buckets, lead-temperature mapping. |
| `hooks/use-analytics-tracker.ts` | `track` and `trackOnce` helpers for render-safe instrumentation. |
| `app/(tabs)/explore.tsx` | Explore filters, section clicks, list impressions, listing taps. |
| `app/explore/[slug].tsx` | Section result list impressions and listing taps from discovery sections. |
| `app/listing/[id].tsx` | Listing detail view, gallery depth, content milestones, attraction clicks, offer clicks, booking starts. |
| `app/booking/[id].tsx` | Standard booking details completion, apartment type changes, review/pay step, booking abandonment. |
| `app/booking/summary/[id].tsx` | Summary view, coupon flow, payment method selection, payment attempts, failures, success, abandonment. |
| `app/(tabs)/offers/[categoryId]/index.tsx` | Offer card selection from offer category lists. |
| `app/(tabs)/offers/[categoryId]/[offerId]/index.tsx` | Offer detail, eligible listing list view, listing selection, booking start from offer detail. |
| `app/offer-booking/[listingId].tsx` | Offer review and booking entry choices. |
| `app/(tabs)/offers/[categoryId]/[offerId]/book.tsx` | Offer booking details completion, apartment type changes, review/pay step, abandonment. |
| `app/offer-booking/summary/[id].tsx` | Offer summary, payment selection, attempts, failures, success, abandonment. |
| `app/(tabs)/bookings.tsx` | Bookings history actions, contact, reference copy, delete behaviour, filter usage. |
| `app/(tabs)/profile/index.tsx` | Profile navigation actions and tier property update. |
| `app/(tabs)/profile/personal-details.tsx` | Personal details update and logout instrumentation. |
| `app/(tabs)/profile/referrals.tsx` | Referral open, copy, share, referral count property. |
| `app/(tabs)/profile/wallet.tsx` | Wallet top-up flow, transaction open, wallet balance property. |
| `app/(tabs)/profile/help.tsx` | Support channel selection. |
| `app/auth/login.tsx`, `app/auth/otp.tsx`, `app/auth/sign-up.tsx` | Login, sign-up, guest-to-user transition. |

## G. Example Event Payloads

### Discovery to listing click

```json
{
  "event_name": "select_item",
  "source_screen": "explore_home",
  "source_surface": "featured_listings",
  "source_section": "lagos_weekend_getaways",
  "item_list_id": "explore:featured",
  "item_list_name": "Featured listings",
  "listing_id": "listing_123",
  "listing_name": "Ocean View Villa",
  "city": "Lagos",
  "apartment_type": "3_bedroom",
  "price": 180000,
  "has_offer": 1,
  "actor_type": "guest",
  "analytics_actor_id": "guest_session_lk3a9x",
  "auth_state": "guest",
  "session_id": "session_lk3a9x"
}
```

### Booking intent

```json
{
  "event_name": "begin_booking",
  "booking_mode": "standard",
  "source_screen": "listing_detail",
  "source_surface": "primary_cta",
  "listing_id": "listing_123",
  "listing_name": "Ocean View Villa",
  "city": "Lagos",
  "apartment_type": "3_bedroom",
  "offer_selected": 0,
  "has_reviews": 1,
  "has_attractions": 1,
  "value": 180000,
  "currency": "NGN",
  "actor_type": "user",
  "analytics_actor_id": "user_42",
  "auth_state": "signed_in",
  "session_id": "session_m3s9t2"
}
```

### Conversion

```json
{
  "event_name": "purchase",
  "booking_mode": "offer",
  "source_screen": "offer_booking_summary",
  "source_surface": "offer_detail",
  "listing_id": "listing_123",
  "city": "Abuja",
  "apartment_type": "2_bedroom",
  "offer_id": "offer_456",
  "offer_name": "Weekend Escape",
  "transaction_id": "pay_ref_789",
  "booking_id": "booking_321",
  "booking_reference": "SH-2026-000321",
  "payment_method": "wallet",
  "value": 95000,
  "booking_value_bucket": "50k_100k",
  "currency": "NGN",
  "coupon_applied": 1,
  "guest_count": 2,
  "nights": 2,
  "actor_type": "user",
  "analytics_actor_id": "user_42",
  "auth_state": "signed_in",
  "session_id": "session_m3s9t2"
}
```

## H. Firebase DebugView / QA Validation

### Debug mode

- iOS: run the dev build with the `-FIRDebugEnabled` launch argument.
- Android: run `adb shell setprop debug.firebase.analytics.app com.safarihills.listings`.
- Disable Android debug mode later with `adb shell setprop debug.firebase.analytics.app .none.`.

### QA checklist

1. Launch the app as a guest and confirm `app_opened` then `screen_view`.
2. On Explore, apply filters and verify `search_filters_applied`.
3. Tap a section then a listing and verify `explore_section_select`, `view_item_list`, `select_item`, `view_item`.
4. Scroll listing media and content and verify `listing_gallery_browse` plus one-time `listing_content_milestone`.
5. Start a booking and confirm `begin_booking`, `apartment_type_select`, `booking_details_completed`, `review_and_pay_click`.
6. Leave before paying and confirm `booking_abandon`.
7. Apply an invalid and valid coupon and confirm `coupon_apply` with `result = failure` and `result = success`.
8. Complete payment and confirm `booking_payment_attempt`, `purchase`, and the correct `payment_method`.
9. Log in from a guest session and confirm `guest_identified` then `login` or `sign_up`.
10. Log out and confirm `logout`, then verify the next event has `actor_type = guest` and a fresh `session_id`.

## I. Event Catalog

Identity fields on every row below are auto-attached by `trackEvent(...)`: `actor_type`, `analytics_actor_id`, `auth_state`, `session_id`.

| event_name | trigger | parameters | identity fields | why it matters |
| --- | --- | --- | --- | --- |
| `app_opened` | First resolved route after launch | `landing_route`, `landing_screen`, `screen_group` | auto | Identifies the first landing surface for campaign attribution and session entry analysis. |
| `screen_view` | Every major route change | `screen_name`, `screen_class`, `route_key`, `screen_group` | auto | Baseline navigation spine for funnels, cohorts, and content pathing. |
| `login` | Successful authentication flow | `method`, `source_screen`, `source_surface` | auto | Measures login completion and the surfaces that recover known users. |
| `sign_up` | Successful sign-up completion | `method`, `source_screen`, `source_surface` | auto | Measures new-user acquisition and downstream quality of sign-up sources. |
| `guest_identified` | Guest becomes authenticated | `guest_actor_id`, `user_id`, `method`, `source_screen` | auto | Preserves the bridge between anonymous intent and known-user conversion. |
| `logout` | Explicit logout or forced session expiry | `source_screen`, `reason` | auto | Marks retention loss and separates post-logout browsing from the old user journey. |
| `search_filters_applied` | Explore filters submitted | `source_screen`, `source_surface`, `filter_count`, `location`, `apartment_type`, `guest_count`, `min_budget`, `max_budget`, `has_dates`, `has_budget`, `amenities_count` | auto | Explains demand shape, preferred inventory, and intent strength before listing views. |
| `explore_section_select` | Explore section card tapped | `source_screen`, `source_surface`, `section_slug`, `section_title`, `section_type`, `matching_count`, `city`, `filter_count` | auto | Shows which discovery surfaces and merchandising sections drive deeper browsing. |
| `listing_list_view` | Explore home listing rail rendered | `list_id`, `list_name`, `source_screen`, `source_surface`, `source_section`, `city`, `list_size`, `matching_count`, `filter_count` | auto | Measures list impressions so you can compare which surfaces create downstream listing clicks and bookings. |
| `view_item_list` | Search section results or offer-eligible listings rendered | `item_list_id`, `item_list_name`, `source_screen`, `source_surface`, `source_section`, `city`, `list_size`, `items` | auto | Gives structured list exposure for funnel attribution and BigQuery list-to-item analysis. |
| `select_item` | Listing card tapped from a list | `source_screen`, `source_surface`, `source_section`, `item_list_id`, `item_list_name`, `listing_id`, `listing_name`, `city`, `apartment_type`, `price`, `has_offer`, `items` | auto | Connects discovery surfaces to listing detail traffic and later conversion. |
| `view_item` | Listing detail screen first loads | `currency`, `value`, `source_screen`, `source_surface`, `source_section`, `listing_id`, `listing_name`, `city`, `apartment_type`, `price`, `has_reviews`, `has_attractions`, `image_count`, `offer_count`, `items` | auto | Core PDP signal for retargeting audiences and listing-level conversion analysis. |
| `view_promotion` | Offer detail or offer review screen opens | `promotion_id`, `promotion_name`, `source_screen`, `source_surface`, `listing_id`, `listing_name`, `city`, `offer_type`, `savings_label` | auto | Measures which promotions are attracting interest and from where. |
| `select_promotion` | Offer card or listing offer tapped | `promotion_id`, `promotion_name`, `source_screen`, `source_surface`, `listing_id`, `listing_name`, `city`, `offer_type`, `savings_label` | auto | Shows which offers actually influence user choice, not just passive views. |
| `listing_gallery_browse` | Listing gallery or photo modal browsed | `listing_id`, `source_surface`, `image_index`, `image_count`, `browse_depth` | auto | A strong engagement-depth signal that helps separate casual browsers from serious evaluators. |
| `listing_content_milestone` | Reviews or attractions section becomes visible | `listing_id`, `milestone`, `city` | auto | Captures deeper evaluation behaviour without noisy continuous scroll tracking. |
| `attraction_select` | Attraction card tapped on listing detail | `source_screen`, `listing_id`, `attraction_id`, `attraction_name`, `city` | auto | Indicates destination-interest and local-experience research, useful for audience building. |
| `begin_booking` | Booking flow starts from listing or offer paths | `booking_mode`, `source_screen`, `source_surface`, `source_section`, `listing_id`, `listing_name`, `city`, `apartment_type`, `offer_id`, `offer_name`, `offer_selected`, `auth_gate_state`, `has_reviews`, `has_attractions`, `value`, `currency` | auto | Primary hot-intent event for lifecycle segmentation and booking-start funnels. |
| `apartment_type_select` | Apartment type changed during booking | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `selected_apartment_type`, `previous_apartment_type`, `offer_id`, `offer_name` | auto | Shows preference shifts and which room categories users compare before buying. |
| `booking_details_completed` | Booking details are valid and user proceeds | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `guest_count`, `nights`, `stay_units`, `stay_unit_type`, `booking_value`, `booking_value_bucket`, `currency`, `offer_id`, `offer_name` | auto | Converts soft intent into structured funnel data for pricing, stay length, and party-size analysis. |
| `review_and_pay_click` | User advances from booking details to summary | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `booking_reference`, `guest_count`, `nights`, `stay_units`, `stay_unit_type`, `booking_value`, `booking_value_bucket`, `currency`, `coupon_code_present`, `offer_id`, `offer_name` | auto | Useful checkpoint between data entry and commercial commitment. |
| `booking_abandon` | User leaves booking before completion | `booking_mode`, `source_screen`, `source_surface`, `source_section`, `listing_id`, `listing_name`, `city`, `apartment_type`, `offer_id`, `offer_name`, `abandon_stage`, `booking_reference`, `booking_value_bucket` | auto | Critical for drop-off analysis and retargeting users who showed intent but did not convert. |
| `booking_summary_view` | Booking summary screen first loads | `booking_mode`, `source_screen`, `source_surface`, `source_section`, `listing_id`, `listing_name`, `city`, `apartment_type`, `booking_id`, `booking_reference`, `guest_count`, `nights`, `booking_value`, `booking_value_bucket`, `currency`, `coupon_code_present`, `payment_state`, `offer_id`, `offer_name` | auto | Establishes the checkout baseline and identifies who reached the payment stage. |
| `coupon_apply` | Coupon attempt returns attempt/success/failure | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `booking_id`, `booking_reference`, `result`, `booking_value_bucket`, `discount_value`, `failure_reason`, `coupon_code_present`, `offer_id`, `offer_name` | auto | Measures promotion responsiveness and friction in discount-driven conversions. |
| `booking_payment_method_select` | Wallet or Paystack selected | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `booking_id`, `booking_reference`, `payment_method`, `booking_value_bucket`, `wallet_balance_bucket`, `offer_id`, `offer_name` | auto | Helps optimize checkout UX and understand payment preference by segment. |
| `booking_payment_attempt` | User submits payment | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `booking_id`, `booking_reference`, `payment_method`, `booking_value`, `booking_value_bucket`, `currency`, `offer_id`, `offer_name` | auto | Separates intent from actual payment initiation and improves checkout funnel precision. |
| `purchase` | Booking payment succeeds | `booking_mode`, `source_screen`, `source_surface`, `source_section`, `listing_id`, `listing_name`, `city`, `apartment_type`, `offer_id`, `offer_name`, `transaction_id`, `booking_id`, `booking_reference`, `payment_method`, `value`, `booking_value_bucket`, `currency`, `coupon_applied`, `guest_count`, `nights`, `items` | auto | Canonical conversion event for revenue, attribution, cohorts, and remarketing suppression. |
| `booking_payment_failure` | Payment fails or cannot proceed | `booking_mode`, `source_screen`, `listing_id`, `listing_name`, `city`, `apartment_type`, `booking_id`, `booking_reference`, `payment_method`, `booking_value_bucket`, `failure_reason`, `offer_id`, `offer_name` | auto | Explains payment friction and isolates fixable checkout blockers. |
| `bookings_action` | Activity inside bookings history | `action`, `source_screen`, `booking_id`, `booking_reference`, `booking_state`, `filter_value`, `city` | auto | Tracks post-purchase engagement, support demand, and repeat-booking signals. |
| `profile_action` | High-value profile and referral actions | `action`, `source_screen`, `changed_fields_count` | auto | Captures retention, account-management, and advocacy behaviour without over-instrumenting the profile area. |
| `support_contact_select` | Contact channel selected from help screen | `source_screen`, `channel` | auto | Measures support channel demand and potential rescue opportunities for high-intent users. |
| `wallet_topup_initiated` | Wallet funding begins | `source_screen`, `amount`, `amount_bucket`, `payment_provider` | auto | Strong purchase-readiness signal and useful for audience building around stored value. |
| `wallet_topup_success` | Wallet funding succeeds | `source_screen`, `amount`, `amount_bucket`, `payment_provider` | auto | Indicates readiness for future conversion and potential repeat-customer value. |
| `wallet_topup_failure` | Wallet funding fails | `source_screen`, `amount`, `amount_bucket`, `payment_provider`, `failure_reason` | auto | Surfaces wallet friction that can depress downstream booking conversion. |
