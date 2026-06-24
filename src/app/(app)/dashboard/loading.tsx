export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 bg-gray-100 rounded-2xl" />
      <div className="h-32 bg-gray-100 rounded-2xl" />
      <div className="h-10 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  )
}
