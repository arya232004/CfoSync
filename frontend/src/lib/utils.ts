import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export const agentColors: Record<string, string> = {
  profile: 'from-blue-500 to-cyan-500',
  insights: 'from-purple-500 to-pink-500',
  risk: 'from-red-500 to-orange-500',
  planning: 'from-green-500 to-emerald-500',
  simulation: 'from-yellow-500 to-amber-500',
  cashflow: 'from-teal-500 to-cyan-500',
  cfo_strategy: 'from-indigo-500 to-purple-500',
  nudge: 'from-pink-500 to-rose-500',
  compliance: 'from-slate-500 to-gray-500',
  document: 'from-orange-500 to-red-500',
  coordinator: 'from-violet-500 to-purple-500',
}

export const agentIcons: Record<string, string> = {
  profile: '👤',
  insights: '💡',
  risk: '⚠️',
  planning: '📋',
  simulation: '🎯',
  cashflow: '💰',
  cfo_strategy: '📊',
  nudge: '🔔',
  compliance: '✅',
  document: '📄',
  coordinator: '🤖',
}
