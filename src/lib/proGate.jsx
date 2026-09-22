import { createContext, useContext } from 'react'

// Which features sit behind Pro. Two independent revoke switches:
//   - per user:    profiles.is_pro (false = that user loses every Pro feature)
//   - per feature: flip an entry here to false to hand it to everyone
// A feature missing from this map is free.
const PRO_FEATURES = {
  programs:    true,
  expressMode: true,
}

const ProGateContext = createContext({ isPro: true, requirePro: () => true, canUse: () => true })

export function ProGateProvider({ isPro, children }) {
  function requirePro() {
    // Beta: everyone is pro. Post-beta: return isPro (false triggers upgrade modal).
    return isPro
  }
  function canUse(feature) {
    return !PRO_FEATURES[feature] || isPro
  }
  return (
    <ProGateContext.Provider value={{ isPro, requirePro, canUse }}>
      {children}
    </ProGateContext.Provider>
  )
}

export function useProGate() {
  return useContext(ProGateContext)
}
