import type { ReactNode } from "react"

interface AnswerSectionProps {
  children: ReactNode
}

export function AnswerSection({ children }: AnswerSectionProps) {
  return <section className="mb-12">{children}</section>
}
