export type TxType = 'income' | 'expense' | 'saving'

export interface Transaction {
  id: string
  user_id: string
  type: TxType
  amount: number
  category: string
  note: string
  occurred_on: string // YYYY-MM-DD
  created_at: string
}

export interface Group {
  id: string
  name: string
  invite_code: string
  currency: string
  created_by: string
  created_at: string
}

export interface Member {
  group_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  name: string
}

export interface Goal {
  id: string
  group_id: string
  name: string
  target_amount: number
  deadline: string | null
  created_by: string | null
  created_at: string
}

export interface Contribution {
  id: string
  group_id: string
  goal_id: string
  user_id: string
  amount: number
  note: string
  created_at: string
  name: string
}

export interface GroupsData {
  groups: Group[]
  members: Member[]
  goals: Goal[]
  contributions: Contribution[]
}

export interface Category {
  id: string
  user_id: string
  type: TxType
  name: string
  emoji: string
  color: string
  sort_order: number
  monthly_limit: number | null
}

export interface Recurring {
  id: string
  user_id: string
  type: TxType
  amount: number
  category: string
  note: string
  day_of_month: number
  active: boolean
  last_run: string | null
  created_at: string
}
