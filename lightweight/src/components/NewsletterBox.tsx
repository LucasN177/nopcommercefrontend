import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { ErrorMessage } from './ui'

export default function NewsletterBox() {
  const [email, setEmail] = useState('')
  const [subscribe, setSubscribe] = useState(true)
  const send = useMutation({
    mutationFn: () => api.post<{ message: string }>('/newsletter/subscribe', { email, subscribe }),
  })

  return (
    <form className="newsletter" onSubmit={e => { e.preventDefault(); send.mutate() }}>
      <input type="email" required placeholder="E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} />
      <div className="row small">
        <label><input type="radio" checked={subscribe} onChange={() => setSubscribe(true)} /> Anmelden</label>
        <label><input type="radio" checked={!subscribe} onChange={() => setSubscribe(false)} /> Abmelden</label>
      </div>
      <button disabled={send.isPending}>Absenden</button>
      {send.data && <p className="small success-text">{send.data.message}</p>}
      <ErrorMessage error={send.error} />
    </form>
  )
}
