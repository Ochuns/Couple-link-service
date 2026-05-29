'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  onToggle: (id: string, completed: boolean) => void
  onEdit: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export default function TaskItem({ task, onToggle, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)

  async function toggleComplete() {
    onToggle(task.id, !task.completed) // 即時反映
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ completed: !task.completed })
      .eq('id', task.id)
  }

  async function saveEdit() {
    const trimmed = title.trim()
    if (!trimmed) { setTitle(task.title); setEditing(false); return }
    onEdit(task.id, trimmed) // 即時反映
    setEditing(false)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ title: trimmed })
      .eq('id', task.id)
  }

  async function deleteTask() {
    onDelete(task.id) // 即時反映
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
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setTitle(task.title); setEditing(false) } }}
          className="flex-1 text-sm border-b border-primary-300 focus:outline-none py-0.5"
        />
      ) : (
        <span
          className={`flex-1 text-sm cursor-pointer ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
          onDoubleClick={() => !task.completed && setEditing(true)}
        >
          {task.title}
        </span>
      )}

      <button onClick={deleteTask} className="text-gray-300 hover:text-red-400 text-xs ml-1 flex-shrink-0">
        ✕
      </button>
    </div>
  )
}
