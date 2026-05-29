import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Task } from '@/types/database'
import TaskList from '@/components/tasks/TaskList'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<Profile, 'couple_id'> | null

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*')
    .eq('couple_id', profile.couple_id)
    .order('created_at', { ascending: true })
  const tasks = (tasksData ?? []) as Task[]

  return (
    <div>
      <h1 className="text-lg font-bold mb-5">やりたいことリスト</h1>
      <TaskList
        initialTasks={tasks}
        coupleId={profile.couple_id}
        currentUserId={user.id}
      />
    </div>
  )
}
