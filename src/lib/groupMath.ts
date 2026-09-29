import type { Contribution, Goal, GroupsData, Member } from './types'
import { MEMBER_COLORS } from './categories'

export interface Slice {
  userId: string
  name: string
  amount: number
  color: string
}

export interface GoalStats {
  goal: Goal
  current: number
  remaining: number
  pct: number
  slices: Slice[]
}

export interface GroupStats {
  total: number
  target: number
  remaining: number
  pct: number
  slices: Slice[]
  goals: GoalStats[]
}

export const clampPct = (n: number) => Math.max(0, Math.min(100, n))

export function colorOf(members: Member[], userId: string): string {
  const sorted = [...members].sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id))
  const idx = sorted.findIndex((m) => m.user_id === userId)
  return MEMBER_COLORS[(idx < 0 ? sorted.length : idx) % MEMBER_COLORS.length]
}

function slicesOf(contribs: Contribution[], members: Member[]): Slice[] {
  const sums = new Map<string, { name: string; amount: number }>()
  for (const c of contribs) {
    const cur = sums.get(c.user_id) ?? { name: c.name, amount: 0 }
    cur.amount += c.amount
    sums.set(c.user_id, cur)
  }
  // aktiv üzvlər sıfır olsa da siyahıda görünsün
  for (const m of members) if (!sums.has(m.user_id)) sums.set(m.user_id, { name: m.name, amount: 0 })
  return [...sums.entries()]
    .map(([userId, v]) => ({
      userId,
      name: members.find((m) => m.user_id === userId)?.name ?? v.name,
      amount: Math.round(v.amount * 100) / 100,
      color: colorOf(members, userId)
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function goalStats(goal: Goal, data: GroupsData): GoalStats {
  const members = data.members.filter((m) => m.group_id === goal.group_id)
  const contribs = data.contributions.filter((c) => c.goal_id === goal.id)
  const current = Math.round(contribs.reduce((s, c) => s + c.amount, 0) * 100) / 100
  return {
    goal,
    current,
    remaining: Math.max(0, Math.round((goal.target_amount - current) * 100) / 100),
    pct: goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0,
    slices: slicesOf(contribs, members)
  }
}

export function groupStats(groupId: string, data: GroupsData): GroupStats {
  const members = data.members.filter((m) => m.group_id === groupId)
  const contribs = data.contributions.filter((c) => c.group_id === groupId)
  const goals = data.goals.filter((g) => g.group_id === groupId).map((g) => goalStats(g, data))
  const total = Math.round(contribs.reduce((s, c) => s + c.amount, 0) * 100) / 100
  const target = goals.reduce((s, g) => s + g.goal.target_amount, 0)
  return {
    total,
    target,
    remaining: Math.max(0, Math.round((target - total) * 100) / 100),
    pct: target > 0 ? (total / target) * 100 : 0,
    slices: slicesOf(contribs, members),
    goals
  }
}
