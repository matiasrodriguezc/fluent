import type { ReactNode } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface InsightCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  children?: ReactNode
}

export function InsightCard({ title, value, change, trend, children }: InsightCardProps) {
  const isPositive = trend === "up"

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-green-600" />
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          <span className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-green-600"}`}>{change}</span>
        </div>

        {/* Chart */}
        {children && <div className="h-12 mt-2">{children}</div>}
      </div>
    </div>
  )
}
