interface Props {
  displayName: string
  size?: 'sm' | 'md' | 'lg'
}

export function VideoPlaceholder({ displayName, size = 'md' }: Props) {
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const sizeClasses = { sm: 'text-lg w-10 h-10', md: 'text-2xl w-16 h-16', lg: 'text-4xl w-24 h-24' }

  // Generate a consistent color from the name
  const colors = [
    'bg-blue-600', 'bg-purple-600', 'bg-green-600',
    'bg-orange-600', 'bg-red-600', 'bg-teal-600', 'bg-pink-600',
  ]
  const color = colors[displayName.charCodeAt(0) % colors.length]

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
      <div className={`rounded-full flex items-center justify-center text-white font-bold ${color} ${sizeClasses[size]}`}>
        {initials}
      </div>
      <span className="text-gray-400 text-sm mt-2 truncate max-w-[80%]">{displayName}</span>
    </div>
  )
}
