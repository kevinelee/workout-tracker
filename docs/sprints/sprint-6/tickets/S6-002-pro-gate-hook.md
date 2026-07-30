# S6-002 — `useProGate` hook + pro context provider

**Priority**: P0
**Status**: Todo
**Depends on**: S6-001

## What
A React context + hook that exposes pro status app-wide and provides a standard way to trigger the upgrade modal.

## API

```js
const { isPro, requirePro } = useProGate()

// Usage in a component:
const handleLockedAction = () => {
  if (!requirePro()) return   // shows upgrade modal, returns false if not pro
  // ... do the pro thing
}
```

## Acceptance Criteria
- `ProGateProvider` wraps the app and reads `is_pro` from the user's profile on mount
- `useProGate()` returns `{ isPro: boolean, requirePro: () => boolean }`
- `requirePro()` returns `true` if user is pro, otherwise fires the upgrade modal and returns `false`
- Pro status refreshes after a successful upgrade without requiring a full page reload
