'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateInviteCode, getCodeExpiryDate, isCodeExpired } from '@/lib/invite-code'

type Mode = 'select' | 'generate' | 'enter'

export default function InvitePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('select')
  const [inviteCode, setInviteCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'generate') {
      handleGenerateCode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  async function handleGenerateCode() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const code = generateInviteCode()
    const expiresAt = getCodeExpiryDate()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('couples') as any).insert({
      user1_id: user.id,
      invite_code: code,
      invite_expires_at: expiresAt.toISOString(),
    })

    if (error) {
      setError('招待コードの発行に失敗しました')
      setLoading(false)
      return
    }

    setGeneratedCode(code)
    setLoading(false)
  }

  async function handleEnterCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: rpcError } = await (supabase as any).rpc('accept_invite_code', {
      p_invite_code: inviteCode.toUpperCase(),
    })

    if (rpcError || !result?.success) {
      const errCode = result?.error
      if (errCode === 'invite_not_found') setError('招待コードが見つかりません')
      else if (errCode === 'invite_expired') setError('この招待コードは期限切れです。パートナーに新しいコードを発行してもらってください。')
      else if (errCode === 'self_invite') setError('自分の招待コードは使用できません')
      else setError('接続に失敗しました')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">💑</div>
            <h1 className="text-xl font-bold">パートナーと繋がろう</h1>
            <p className="text-sm text-gray-500 mt-1">招待コードを使って接続します</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setMode('generate')}
              className="w-full border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-medium rounded-lg py-3 text-sm transition-colors"
            >
              招待コードを発行する
            </button>
            <button
              onClick={() => setMode('enter')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
            >
              パートナーのコードを入力する
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'generate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">🔑</div>
          <h2 className="text-xl font-bold mb-2">あなたの招待コード</h2>
          <p className="text-sm text-gray-500 mb-6">このコードをパートナーに伝えてください（24時間有効）</p>

          {loading ? (
            <div className="text-gray-400 py-8">発行中...</div>
          ) : (
            <>
              <div className="bg-primary-50 rounded-xl py-6 px-8 mb-6">
                <span className="text-4xl font-mono font-bold tracking-widest text-primary-700">
                  {generatedCode}
                </span>
              </div>
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              <p className="text-sm text-gray-500 mb-4">
                パートナーがコードを入力すると自動的に繋がります
              </p>
              <button
                onClick={() => setMode('select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← 戻る
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h2 className="text-xl font-bold">招待コードを入力</h2>
          <p className="text-sm text-gray-500 mt-1">パートナーから教えてもらったコード</p>
        </div>

        <form onSubmit={handleEnterCode} className="space-y-4">
          <input
            type="text"
            required
            maxLength={6}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:border-primary-500"
            placeholder="XXXXXX"
          />

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || inviteCode.length !== 6}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? '接続中...' : '繋がる 💕'}
          </button>
          <button
            type="button"
            onClick={() => setMode('select')}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            ← 戻る
          </button>
        </form>
      </div>
    </div>
  )
}
