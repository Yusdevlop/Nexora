import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/format'
import { useGroups } from '../context/DataContext'
import { useToast } from '../components/Toast'
import { EmptyState } from '../components/Bits'

/** /join/KOD linkinə toxunanda avtomatik qrupa qoşulur */
export default function JoinRoute() {
  const { code } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useGroups()
  const [err, setErr] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !code) return
    started.current = true
    void (async () => {
      const { data, error } = await supabase.rpc('join_group', { p_code: code })
      if (error) return setErr(friendlyError(error))
      await refresh()
      toast('Qrupa qoşuldunuz', 'success')
      navigate(`/groups/${data as string}`, { replace: true })
    })()
  }, [code, navigate, refresh, toast])

  return (
    <div className="page">
      {err ? (
        <EmptyState emoji="🔑" title="Qoşulmaq alınmadı" text={err}>
          <Link className="btn btn-primary small" to="/groups">
            Qruplara keç
          </Link>
        </EmptyState>
      ) : (
        <div className="card skeleton tall" />
      )}
    </div>
  )
}
