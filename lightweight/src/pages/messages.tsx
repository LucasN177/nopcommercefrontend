import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { api } from '../api/client'
import type { PrivateMessageListModel, PrivateMessageModel, SendPrivateMessageModel } from '../api/types'
import { useToast } from '../components/Toast'
import { ErrorMessage, Field, formatDate, Notice, Pager, QueryView } from '../components/ui'

export function PrivateMessagesPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'inbox'
  const page = Number(params.get('page') ?? 1)
  const list = useQuery({ queryKey: ['pm', tab, page], queryFn: () => api.get<PrivateMessageListModel>('/private-messages', { tab, page }) })

  return (
    <>
      <h1>Private Nachrichten</h1>
      <div className="tabs">
        <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setParams({ tab: 'inbox' })}>Posteingang</button>
        <button className={tab === 'sent' ? 'active' : ''} onClick={() => setParams({ tab: 'sent' })}>Gesendet</button>
      </div>
      <QueryView query={list}>
        {l =>
          l.messages.length === 0 ? (
            <Notice>Keine Nachrichten.</Notice>
          ) : (
            <>
              <table className="table">
                <thead><tr><th>{tab === 'inbox' ? 'Von' : 'An'}</th><th>Betreff</th><th>Datum</th></tr></thead>
                <tbody>
                  {l.messages.map(m => (
                    <tr key={m.id} className={!m.isRead && tab === 'inbox' ? 'unread' : ''}>
                      <td>{tab === 'inbox' ? m.customerFromName : m.customerToName}</td>
                      <td><Link to={`/viewpm/${m.id}`}>{m.subject}</Link></td>
                      <td>{formatDate(m.createdOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager pager={l.pagerModel} onPage={p => setParams({ tab, page: String(p) })} />
            </>
          )
        }
      </QueryView>
    </>
  )
}

export function PrivateMessagePage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const message = useQuery({ queryKey: ['pm-detail', id], queryFn: () => api.get<PrivateMessageModel>(`/private-messages/${id}`) })
  const remove = useMutation({
    mutationFn: () => api.delete(`/private-messages/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm'] })
      navigate('/privatemessages')
    },
    onError: error => toast(error.message, 'error'),
  })
  const markUnread = useMutation({
    mutationFn: () => api.post(`/private-messages/${id}/mark-unread`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm'] })
      void queryClient.invalidateQueries({ queryKey: ['layout'] })
      toast('Als ungelesen markiert')
    },
  })
  return (
    <QueryView query={message}>
      {m => (
        <>
          <h1>{m.subject}</h1>
          <p className="small muted">Von {m.customerFromName} an {m.customerToName} · {formatDate(m.createdOn)}</p>
          <div className="card pm-body">{m.message}</div>
          <div className="row">
            <Link className="button" to={`/sendpm/${m.fromCustomerId}?replyTo=${m.id}`}>Antworten</Link>
            <button onClick={() => markUnread.mutate()}>Als ungelesen markieren</button>
            <button className="danger" onClick={() => remove.mutate()}>Löschen</button>
          </div>
        </>
      )}
    </QueryView>
  )
}

export function SendPrivateMessagePage() {
  const toCustomerId = Number(useParams().toCustomerId)
  const [params] = useSearchParams()
  const replyToMessageId = params.get('replyTo') ? Number(params.get('replyTo')) : undefined
  const navigate = useNavigate()
  const form = useQuery({
    queryKey: ['pm-new', toCustomerId, replyToMessageId],
    queryFn: () => api.get<SendPrivateMessageModel>('/private-messages/new', { toCustomerId, replyToMessageId }),
  })
  return (
    <QueryView query={form}>
      {model => <SendForm model={model} onSent={m => navigate(`/viewpm/${m.id}`)} />}
    </QueryView>
  )
}

function SendForm({ model, onSent }: { model: SendPrivateMessageModel; onSent: (m: PrivateMessageModel) => void }) {
  const [subject, setSubject] = useState(model.subject ?? '')
  const [message, setMessage] = useState(model.message ?? '')
  const send = useMutation({
    mutationFn: () => api.post<PrivateMessageModel>('/private-messages', { ...model, subject, message }),
    onSuccess: onSent,
  })
  return (
    <form className="card narrow" onSubmit={e => { e.preventDefault(); send.mutate() }}>
      <h1>Nachricht an {model.customerToName}</h1>
      <Field label="Betreff" required><input required value={subject} onChange={e => setSubject(e.target.value)} /></Field>
      <Field label="Nachricht" required><textarea required rows={8} value={message} onChange={e => setMessage(e.target.value)} /></Field>
      <ErrorMessage error={send.error} />
      <button className="primary" disabled={send.isPending}>Senden</button>
    </form>
  )
}
