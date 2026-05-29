'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TaskItem from './TaskItem'
import type { Task } from '@/types/database'

interface Props {
  initialTasks: Task[]
  coupleId: string
  currentUserId: string
}

export default function TaskList({ initialTasks, coupleId, currentUserId }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  // Realtime: パートナーの変更を反映
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`couple:${coupleId}:tasks`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `couple_id=eq.${coupleId}` },
        () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(supabase.from('tasks') as any)
            .select('*')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: true })
            .then(({ data }: { data: Task[] | null }) => {
              if (data) setTasks(data)
            })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  // 楽観的更新ハンドラー
  function handleToggle(id: string, completed: boolean) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed } : t))
  }

  function handleEdit(id: string, title: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, title } : t))
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setAdding(true)

    // 楽観的に追加
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      couple_id: coupleId,
      title: trimmed,
      completed: false,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTasks((prev) => [...prev, tempTask])
    setNewTitle('')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('tasks') as any)
      .insert({ couple_id: coupleId, title: trimmed, created_by: currentUserId })
      .select()
      .single()

    // temp ID を実際の ID に置換
    if (data) {
      setTasks((prev) => prev.map((t) => t.id === tempTask.id ? data as Task : t))
    }
    setAdding(false)
  }

  const pending = tasks.filter((t) => !t.completed)
  const completed = tasks.filter((t) => t.completed)

  return (
    <div className="space-y-4">
      <form onSubmit={addTask} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="やりたいことを追加..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 rounded-lg text-sm transition-colors"
        >
          追加
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {pending.length === 0 && completed.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            やりたいことを追加しましょう！
          </p>
        )}
        {pending.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {completed.length > 0 && (
          <>
            <p className="text-xs text-gray-400 px-3 py-2">完了済み</p>
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
