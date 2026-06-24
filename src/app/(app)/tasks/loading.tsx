export default function TasksLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-100 rounded-lg" />
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
