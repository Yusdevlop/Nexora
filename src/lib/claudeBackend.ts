/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================
//  Claude-hosted variant: Supabase əvəzinə Claude-un `db` və `user` imkanları.
//  Tətbiqin qalan hissəsi bu modulla, sanki Supabase client-dir, danışır
//  (from().select()/insert()/update()/delete(), rpc(), channel(), auth).
//
//  Məlumat modeli:
//   data/users/<uid>/m-YYYY-MM   şəxsi əməliyyatlar (aylıq sənəd, YALNIZ sahibi görür)
//   kp_profiles/<uid>            özünün seçdiyi ad (yalnız özü yazır)
//   kp_groups/<gid>              qrup + üzvlər xəritəsi
//   kp_goals/<id>                məqsəd
//   kp_contribs/<id>             hər əlavə/çıxarış ayrıca sənəd (paralel yazılarda itki olmasın)
// =====================================================================
type Row = Record<string, any>
type Listener = (table: string, payload: any) => void

export const isConfigured = true

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const now = () => new Date().toISOString()
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
function randomCode() {
  const a = new Uint32Array(8)
  crypto.getRandomValues(a)
  return Array.from(a, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('')
}

let uid = ''
let myName = ''
let db: any = null

const userDocs = new Map<string, Row>() // data/users/{uid}/* : 'm-YYYY-MM' (əməliyyatlar) və 'categories' (kateqoriyalar)
const groups = new Map<string, Row>()
const goals = new Map<string, Row>()
const contribs = new Map<string, Row>()
const profiles = new Map<string, Row>()

const listeners = new Set<Listener>()
function emit(table: string, eventType: string, row: Row) {
  for (const l of listeners) l(table, { eventType, table, new: row, old: { id: row.id } })
}

let identityDone!: (ok: boolean) => void
const identity = new Promise<boolean>((r) => (identityDone = r))
let dataDone!: (ok: boolean) => void
const dataReady = new Promise<boolean>((r) => (dataDone = r))

/** Kolleksiyanı dinləyir; ilk DEFİNİTİV snapshot-dan sonrakı dəyişiklikləri real-time hadisə kimi ötürür. */
function watch(path: string, map: Map<string, Row>, tables: string[]): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false
    const timer = setTimeout(resolve, 8000)
    db.collection(path).onSnapshot(
      (snap: any) => {
        const live = settled
        for (const ch of snap.docChanges()) {
          const id = ch.doc.id
          if (ch.type === 'removed') {
            const old = map.get(id)
            map.delete(id)
            if (live) tables.forEach((t) => emit(t, 'DELETE', { ...old, id }))
          } else {
            const row = { id, ...(ch.doc.data() ?? {}) }
            map.set(id, row)
            if (live) tables.forEach((t) => emit(t, ch.type === 'added' ? 'INSERT' : 'UPDATE', row))
          }
        }
        if (!settled && !snap.metadata?.fromCache) {
          settled = true
          clearTimeout(timer)
          resolve()
        }
      },
      () => resolve()
    )
  })
}

async function init() {
  try {
    const c = (window as any).claude
    if (!c?.use) throw new Error('no claude runtime')
    const [dbNs, userNs] = await Promise.all([c.use('db'), c.use('user')])
    if (!dbNs || !userNs) throw new Error('capability missing')
    const me = await userNs.me()
    if (!me?.id) throw new Error('no identity')
    uid = me.id
    myName = me.name || ''
    db = dbNs
    identityDone(true)

    await Promise.all([
      watch(`data/users/${uid}`, userDocs, ['transactions', 'categories', 'recurring']),
      watch('kp_profiles', profiles, ['profiles']),
      watch('kp_groups', groups, ['groups', 'group_members']),
      watch('kp_goals', goals, ['group_goals']),
      watch('kp_contribs', contribs, ['group_contributions'])
    ])
    if (!profiles.get(uid)?.display_name) {
      const display_name = myName || 'İstifadəçi'
      await db.doc(`kp_profiles/${uid}`).set({ display_name })
      profiles.set(uid, { id: uid, display_name })
    }
    if (!userDocs.get('categories')) {
      const items = defaultCategories()
      await db.doc(`data/users/${uid}/categories`).set({ items })
      userDocs.set('categories', { id: 'categories', items })
    }
    dataDone(true)
  } catch {
    identityDone(false)
    dataDone(false)
  }
}
void init()

/* ------------------------------ yardımçılar ------------------------------ */
const nameOf = (userId: string) => profiles.get(userId)?.display_name || ''
const isMember = (gid: string) => !!groups.get(gid)?.members?.[uid]
const num = (v: any) => Number(v) || 0

function allTransactions(): Row[] {
  const out: Row[] = []
  for (const [id, m] of userDocs) if (id.startsWith('m-')) out.push(...(m.items ?? []))
  return out
}

function defaultCategories(): Row[] {
  const mk = (type: string, name: string, emoji: string, color: string, sort_order: number) => ({ id: rid(), type, name, emoji, color, sort_order, monthly_limit: null })
  return [
    mk('income', 'Maaş', '💼', '#5BE3C0', 1), mk('income', 'Biznes', '📈', '#9DB0FF', 2), mk('income', 'Bonus', '🎁', '#F6C667', 3), mk('income', 'Digər', '✨', '#7CD6FF', 9),
    mk('expense', 'Qida', '🍽️', '#FF8FA3', 1), mk('expense', 'Nəqliyyat', '🚕', '#F6C667', 2), mk('expense', 'Kommunal', '💡', '#9DB0FF', 3),
    mk('expense', 'Alış-veriş', '🛍️', '#C9A2FF', 4), mk('expense', 'Sağlamlıq', '💊', '#7CD6FF', 5), mk('expense', 'Əyləncə', '🎬', '#FF8FA3', 6), mk('expense', 'Digər', '🧾', '#93A1BB', 9),
    mk('saving', 'Ümumi', '🐷', '#9DB0FF', 1), mk('saving', 'Təcili ehtiyat', '🛟', '#5BE3C0', 2), mk('saving', 'Səyahət', '✈️', '#7CD6FF', 3), mk('saving', 'Digər', '🪙', '#F6C667', 9)
  ]
}

function categoryItems(): Row[] {
  return userDocs.get('categories')?.items ?? []
}

async function writeCategories(items: Row[]) {
  userDocs.set('categories', { id: 'categories', items })
  await db.doc(`data/users/${uid}/categories`).set({ items })
}

async function categoryAdd(p: Row) {
  const type = p.type, name = String(p.name ?? '').trim()
  if (!name) throw new Error('Kateqoriyanın adını yazın.')
  const items = categoryItems()
  if (items.some((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())) throw new Error('Bu adda kateqoriya artıq var.')
  const sort_order = Math.max(0, ...items.filter((c) => c.type === type).map((c) => num(c.sort_order))) + 1
  await writeCategories([...items, { id: rid(), type, name, emoji: p.emoji, color: p.color, sort_order, monthly_limit: p.monthly_limit ?? null }])
}

async function categoryUpdate(id: string, patch: Row) {
  const items = categoryItems()
  await writeCategories(items.map((c) => (c.id === id ? { ...c, ...patch, name: patch.name !== undefined ? String(patch.name).trim() : c.name } : c)))
}

async function categoryRemove(id: string) {
  await writeCategories(categoryItems().filter((c) => c.id !== id))
}

/* ------------------------------ təkrarlanan əməliyyatlar ------------------------------ */
function recurringItems(): Row[] {
  return userDocs.get('recurring')?.items ?? []
}

async function writeRecurring(items: Row[]) {
  userDocs.set('recurring', { id: 'recurring', items })
  await db.doc(`data/users/${uid}/recurring`).set({ items })
}

async function recurringAdd(p: Row) {
  const item = { id: rid(), type: p.type, amount: num(p.amount), category: p.category, note: p.note ?? '', day_of_month: num(p.day_of_month), active: true, last_run: null, created_at: now() }
  await writeRecurring([...recurringItems(), item])
}

async function recurringUpdate(id: string, patch: Row) {
  await writeRecurring(recurringItems().map((r) => (r.id === id ? { ...r, ...patch } : r)))
}

async function recurringRemove(id: string) {
  await writeRecurring(recurringItems().filter((r) => r.id !== id))
}

const views: Record<string, () => Row[]> = {
  profiles: () => [...profiles.values()].map((p) => ({ id: p.id, display_name: p.display_name })),
  transactions: allTransactions,
  categories: () => categoryItems().map((c) => ({ id: c.id, user_id: uid, type: c.type, name: c.name, emoji: c.emoji, color: c.color, sort_order: num(c.sort_order), monthly_limit: c.monthly_limit ?? null })),
  recurring: () => recurringItems().map((r) => ({ id: r.id, user_id: uid, type: r.type, amount: num(r.amount), category: r.category, note: r.note ?? '', day_of_month: num(r.day_of_month), active: !!r.active, last_run: r.last_run ?? null, created_at: r.created_at })),
  groups: () =>
    [...groups.values()]
      .filter((g) => isMember(g.id))
      .map((g) => ({ id: g.id, name: g.name, invite_code: g.invite_code, currency: g.currency, created_by: g.created_by, created_at: g.created_at })),
  group_members: () =>
    [...groups.values()].flatMap((g) =>
      isMember(g.id)
        ? Object.entries<any>(g.members ?? {})
            .filter(([, m]) => !!m)
            .map(([userId, m]) => ({
              group_id: g.id,
              user_id: userId,
              role: m.role,
              joined_at: m.joined_at,
              profiles: nameOf(userId) ? { display_name: nameOf(userId) } : null
            }))
        : []
    ),
  group_goals: () =>
    [...goals.values()]
      .filter((g) => isMember(g.group_id))
      .map((g) => ({ id: g.id, group_id: g.group_id, name: g.name, target_amount: g.target_amount, deadline: g.deadline ?? null, created_by: g.created_by, created_at: g.created_at })),
  group_contributions: () =>
    [...contribs.values()]
      .filter((c) => isMember(c.group_id))
      .map((c) => ({
        id: c.id,
        group_id: c.group_id,
        goal_id: c.goal_id,
        user_id: c.user_id,
        amount: c.amount,
        note: c.note ?? '',
        created_at: c.created_at,
        profiles: nameOf(c.user_id) ? { display_name: nameOf(c.user_id) } : null
      }))
}

/* ------------------------------ şəxsi əməliyyatlar ------------------------------ */
let txQueue: Promise<unknown> = Promise.resolve()
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = txQueue.then(fn, fn)
  txQueue = run.catch(() => undefined)
  return run
}

async function writeMonth(key: string, items: Row[]) {
  const id = `m-${key}`
  userDocs.set(id, { id, items })
  await db.doc(`data/users/${uid}/${id}`).set({ items })
}

const monthItems = (key: string): Row[] => userDocs.get(`m-${key}`)?.items ?? []

function txInsert(p: Row) {
  return serial(async () => {
    const item = { id: `${p.occurred_on}_${rid()}`, user_id: uid, type: p.type, amount: num(p.amount), category: p.category, note: p.note ?? '', occurred_on: p.occurred_on, created_at: now() }
    const key = String(p.occurred_on).slice(0, 7)
    await writeMonth(key, [...monthItems(key), item])
    return item
  })
}

function findTx(id: string): { key: string; item: Row } | null {
  for (const [mid, m] of userDocs) {
    if (!mid.startsWith('m-')) continue
    const item = (m.items ?? []).find((t: Row) => t.id === id)
    if (item) return { key: mid.slice(2), item }
  }
  return null
}

function txUpdate(id: string, p: Row) {
  return serial(async () => {
    const found = findTx(id)
    if (!found) throw new Error('Əməliyyat tapılmadı.')
    const next = { ...found.item, type: p.type, amount: num(p.amount), category: p.category, note: p.note ?? '', occurred_on: p.occurred_on }
    const newKey = String(next.occurred_on).slice(0, 7)
    if (newKey === found.key) {
      await writeMonth(found.key, monthItems(found.key).map((t) => (t.id === id ? next : t)))
    } else {
      await writeMonth(found.key, monthItems(found.key).filter((t) => t.id !== id))
      await writeMonth(newKey, [...monthItems(newKey), next])
    }
  })
}

function txDelete(id: string) {
  return serial(async () => {
    const found = findTx(id)
    if (!found) return
    await writeMonth(found.key, monthItems(found.key).filter((t) => t.id !== id))
  })
}

/* ------------------------------ qruplar ------------------------------ */
async function createGoal(gid: string, name: string, target: number, deadline: string | null) {
  const id = rid()
  const data = { group_id: gid, name: name.trim(), target_amount: target, deadline: deadline || null, created_by: uid, created_at: now() }
  goals.set(id, { id, ...data })
  await db.doc(`kp_goals/${id}`).set(data)
}

async function createGroup(a: Row): Promise<string> {
  const name = String(a.p_name ?? '').trim()
  if (!name) throw new Error('Qrupun adı boş ola bilməz.')
  let code = randomCode()
  while ([...groups.values()].some((g) => g.invite_code === code)) code = randomCode()
  const id = rid()
  const data = { name, invite_code: code, currency: 'AZN', created_by: uid, created_at: now(), members: { [uid]: { role: 'owner', joined_at: now() } } }
  groups.set(id, { id, ...data })
  await db.doc(`kp_groups/${id}`).set(data)
  if (num(a.p_target) > 0) await createGoal(id, String(a.p_goal_name || name), num(a.p_target), a.p_deadline ?? null)
  return id
}

async function joinGroup(a: Row): Promise<string> {
  const code = String(a.p_code ?? '').trim().toUpperCase()
  const g = [...groups.values()].find((x) => x.invite_code === code)
  if (!g) throw new Error('Bu kodla qrup tapılmadı.')
  if (!g.members?.[uid]) {
    const member = { role: 'member', joined_at: now() }
    g.members = { ...(g.members ?? {}), [uid]: member }
    await db.doc(`kp_groups/${g.id}`).update({ members: { [uid]: member } })
  }
  return g.id
}

async function leaveGroup(gid: string) {
  const g = groups.get(gid)
  if (!g?.members?.[uid]) return
  if (g.members[uid].role === 'owner') throw new Error('Qrupun sahibi qrupdan çıxa bilməz, qrupu silə bilər.')
  g.members = { ...g.members, [uid]: null }
  await db.doc(`kp_groups/${gid}`).update({ members: { [uid]: null } })
}

async function deleteGoalDocs(goalId: string) {
  for (const c of [...contribs.values()].filter((x) => x.goal_id === goalId)) {
    contribs.delete(c.id)
    await db.doc(`kp_contribs/${c.id}`).delete()
  }
  goals.delete(goalId)
  await db.doc(`kp_goals/${goalId}`).delete()
}

async function deleteGoal(id: string) {
  const g = goals.get(id)
  if (!g) return
  const owner = groups.get(g.group_id)?.members?.[uid]?.role === 'owner'
  if (!owner && g.created_by !== uid) throw new Error('Bu məqsədi silmək icazəniz yoxdur.')
  await deleteGoalDocs(id)
}

async function deleteGroup(id: string) {
  const g = groups.get(id)
  if (!g) return
  if (g.members?.[uid]?.role !== 'owner') throw new Error('Qrupu yalnız sahibi silə bilər.')
  for (const goal of [...goals.values()].filter((x) => x.group_id === id)) await deleteGoalDocs(goal.id)
  groups.delete(id)
  await db.doc(`kp_groups/${id}`).delete()
}

const mineOnGoal = (goalId: string, exceptId?: string) =>
  [...contribs.values()].filter((c) => c.goal_id === goalId && c.user_id === uid && c.id !== exceptId).reduce((s, c) => s + num(c.amount), 0)

async function insertContribution(p: Row) {
  if (!isMember(p.group_id)) throw new Error('Bu qrupun üzvü deyilsiniz.')
  const goal = goals.get(p.goal_id)
  if (!goal || goal.group_id !== p.group_id) throw new Error('Məqsəd tapılmadı.')
  const amount = num(p.amount)
  if (!amount) throw new Error('Məbləğ sıfır ola bilməz.')
  if (amount < 0 && mineOnGoal(p.goal_id) + amount < 0) throw new Error('Çıxarmaq istədiyiniz məbləğ bu məqsədə əlavə etdiyiniz məbləğdən çoxdur.')
  const id = rid()
  const data = { group_id: p.group_id, goal_id: p.goal_id, user_id: uid, amount, note: p.note ?? '', created_at: now() }
  contribs.set(id, { id, ...data })
  await db.doc(`kp_contribs/${id}`).set(data)
}

async function deleteContribution(id: string) {
  const c = contribs.get(id)
  if (!c) return
  if (c.user_id !== uid) throw new Error('Yalnız öz əlavənizi silə bilərsiniz.')
  if (num(c.amount) > 0 && mineOnGoal(c.goal_id, id) < 0) throw new Error('Bu əlavəni silmək olmaz: sonrakı çıxarışlar var.')
  contribs.delete(id)
  await db.doc(`kp_contribs/${id}`).delete()
}

async function updateProfile(id: string, name: string) {
  if (id !== uid) throw new Error('Yalnız öz adınızı dəyişə bilərsiniz.')
  const display_name = String(name).trim()
  profiles.set(uid, { id: uid, display_name })
  await db.doc(`kp_profiles/${uid}`).set({ display_name })
}

/* ------------------------------ Supabase-uyğun sorğu qurucusu ------------------------------ */
class Query {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any
  private filters: [string, any][] = []
  private orders: [string, boolean][] = []
  private lim = Infinity
  private one = false
  constructor(private table: string) {}

  select(_cols?: string) {
    return this
  }
  insert(p: any) {
    this.op = 'insert'
    this.payload = p
    return this
  }
  update(p: any) {
    this.op = 'update'
    this.payload = p
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(col: string, val: any) {
    this.filters.push([col, val])
    return this
  }
  order(col: string, o?: { ascending?: boolean }) {
    this.orders.push([col, o?.ascending !== false])
    return this
  }
  limit(n: number) {
    this.lim = n
    return this
  }
  maybeSingle() {
    this.one = true
    return this
  }
  then(res?: (v: any) => any, rej?: (e: any) => any) {
    return this.exec().then(res, rej)
  }

  private filterVal(col: string) {
    return this.filters.find(([c]) => c === col)?.[1]
  }

  private async exec(): Promise<{ data: any; error: any }> {
    if (!(await dataReady)) return { data: null, error: { message: 'Yaddaş bağlantısı yoxdur. Səhifəni claude.ai-da yenidən açın.' } }
    try {
      const t = this.table
      if (this.op === 'select') {
        let rows = (views[t]?.() ?? []).filter((r) => this.filters.every(([c, v]) => r[c] === v))
        for (const [col, asc] of [...this.orders].reverse()) {
          rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1))
        }
        rows = rows.slice(0, this.lim)
        return { data: this.one ? rows[0] ?? null : rows, error: null }
      }
      if (this.op === 'insert') {
        if (t === 'transactions') await txInsert(this.payload)
        else if (t === 'group_goals') {
          if (!isMember(this.payload.group_id)) throw new Error('Bu qrupun üzvü deyilsiniz.')
          await createGoal(this.payload.group_id, this.payload.name, num(this.payload.target_amount), this.payload.deadline)
        } else if (t === 'group_contributions') await insertContribution(this.payload)
        else if (t === 'categories') await categoryAdd(this.payload)
        else if (t === 'recurring') await recurringAdd(this.payload)
        else throw new Error('Dəstəklənmir')
        return { data: null, error: null }
      }
      if (this.op === 'update') {
        if (t === 'transactions') await txUpdate(this.filterVal('id'), this.payload)
        else if (t === 'profiles') await updateProfile(this.filterVal('id'), this.payload.display_name)
        else if (t === 'categories') await categoryUpdate(this.filterVal('id'), this.payload)
        else if (t === 'recurring') await recurringUpdate(this.filterVal('id'), this.payload)
        else throw new Error('Dəstəklənmir')
        return { data: null, error: null }
      }
      // delete
      if (t === 'transactions') await txDelete(this.filterVal('id'))
      else if (t === 'group_contributions') await deleteContribution(this.filterVal('id'))
      else if (t === 'group_goals') await deleteGoal(this.filterVal('id'))
      else if (t === 'groups') await deleteGroup(this.filterVal('id'))
      else if (t === 'categories') await categoryRemove(this.filterVal('id'))
      else if (t === 'recurring') await recurringRemove(this.filterVal('id'))
      else if (t === 'group_members') {
        if (this.filterVal('user_id') !== uid) throw new Error('Yalnız özünüz qrupdan çıxa bilərsiniz.')
        await leaveGroup(this.filterVal('group_id'))
      } else throw new Error('Dəstəklənmir')
      return { data: null, error: null }
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } }
    }
  }
}

function channel(_name: string) {
  const subs: { table: string; cb: (p: any) => void }[] = []
  let listener: Listener | null = null
  const ch: any = {
    on(_type: string, filter: { table: string }, cb: (p: any) => void) {
      subs.push({ table: filter.table, cb })
      return ch
    },
    subscribe(status?: (s: string) => void) {
      void dataReady.then((ok) => {
        if (!ok) return status?.('CHANNEL_ERROR')
        listener = (table, payload) => subs.forEach((s) => s.table === table && s.cb(payload))
        listeners.add(listener)
        status?.('SUBSCRIBED')
      })
      return ch
    },
    _stop() {
      if (listener) listeners.delete(listener)
    }
  }
  return ch
}

export const supabase: any = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: Row) => {
    if (!(await dataReady)) return { data: null, error: { message: 'Yaddaş bağlantısı yoxdur.' } }
    try {
      if (name === 'create_group') return { data: await createGroup(args), error: null }
      if (name === 'join_group') return { data: await joinGroup(args), error: null }
      throw new Error('Naməlum əməliyyat')
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } }
    }
  },
  channel,
  removeChannel: (ch: any) => {
    ch?._stop?.()
    return Promise.resolve('ok')
  },
  auth: {
    getSession: async () => {
      const ok = await identity
      const session = ok ? { user: { id: uid, email: null, user_metadata: { display_name: myName } } } : null
      return { data: { session } }
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: { message: 'Bu versiyada giriş Claude hesabı ilə avtomatikdir.' } }),
    signUp: async () => ({ data: { session: null }, error: { message: 'Bu versiyada qeydiyyat lazım deyil.' } }),
    signInWithOAuth: async () => ({ error: { message: 'Dəstəklənmir' } }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ error: null })
  }
}
