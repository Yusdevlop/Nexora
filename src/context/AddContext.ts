import { createContext, useContext } from 'react'
import type { TxType } from '../lib/types'

export const AddContext = createContext<(type?: TxType) => void>(() => {})
export const useAdd = () => useContext(AddContext)
