import { createContext, useContext } from 'react'

const ProGateContext = createContext({ isPro: true, requirePro: () => true })

export function ProGateProvider({ isPro, children }) {
  function requirePro() {
    // Beta: everyone is pro. Post-beta: return isPro (false triggers upgrade modal).
    return isPro
  }
  return (
    <ProGateContext.Provider value={{ isPro, requirePro }}>
      {children}
    </ProGateContext.Provider>
  )
}

export function useProGate() {
  return useContext(ProGateContext)
}
