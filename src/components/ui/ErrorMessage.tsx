interface Props {
  message: string
  className?: string
}

export default function ErrorMessage({ message, className = '' }: Props) {
  return (
    <p className={`text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 ${className}`}>
      {message}
    </p>
  )
}
