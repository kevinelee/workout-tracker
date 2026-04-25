# S6-004 — Stripe checkout integration (or admin toggle)

**Priority**: P1
**Status**: Todo
**Depends on**: S6-001

## Phase 1 (testing): Admin toggle
- Supabase admin can flip `is_pro = true` on any user row manually
- Lets us test all gates end-to-end without Stripe wired up

## Phase 2 (production): Stripe Checkout
- Create a Stripe product + price (monthly recurring)
- Supabase Edge Function: `create-checkout-session` → returns a hosted checkout URL
- Stripe webhook Edge Function: `stripe-webhook` → on `checkout.session.completed`, sets `is_pro = true` and stores `stripe_customer_id` on the profile
- On cancellation webhook: set `is_pro = false`

## Acceptance Criteria (Phase 2)
- Clicking upgrade in the modal opens Stripe hosted checkout
- Successful payment sets `is_pro = true` within ~5 seconds (webhook)
- Cancelling subscription eventually reverts `is_pro` to false
- `stripe_customer_id` stored on profile for future subscription management
