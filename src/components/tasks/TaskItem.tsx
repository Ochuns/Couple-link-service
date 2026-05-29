'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  currentUserId: string
}

export default function TaskItem({ task, currentUserId: _currentUserId }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [loading, setLoading] = useState(false)

  async function toggleComplete() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ completed: !task.completed })
      .eq('id', task.id)
  }

  async function saveEdit() {
    if (!title.trim()) return
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ title: title.trim() })
      .eq('id', task.id)
    setLoading(false)
    setEditing(false)
  }

  async function deleteTask() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', task.id)
  }

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-xl ${task.completed ? 'opacity-50' : ''}`}>
      <button onClick={toggleComplete} className="flex-shrink-0">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.completed ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
        }`}>
          {task.completed && <span className="text-white text-xs">✓</span>}
        </div>
      </button>

      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 text-sm border-b border-primary-300 focus:outline-none py-0.5"
          disabled={loading}
        />
      ) : (
        <span
          className={`flex-1 text-sm cursor-pointer ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
          onDoubleClick={() => !task.completed && setEditing(true)}
        >
          {task.title}
        </span>
      )}

      {task.completed && (
        <button onClick={deleteTask} className="text-gray-300 hover:text-red-400 text-xs ml-1">
          ✕
        </button>
      )}
    </div>
  )
}
