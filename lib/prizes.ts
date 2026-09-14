import { computeStandings, type StandingRow } from '@/lib/data'
import type { AppUser, Match, Prediction, StageId, StagePayment } from '@/lib/types'

export interface StagePrizeResult {
  stageId: StageId
  configuredPrize: number
  winners: StandingRow[]
  prizePerWinner: number
}

export interface PrizeSummary {
  collected: number
  stagePrizes: number
  finalPrize: number
  stages: StagePrizeResult[]
}

function compareForPrize(a: StandingRow, b: StandingRow) {
  return (
    b.points - a.points ||
    b.exact - a.exact ||
    b.correct1x2 - a.correct1x2
  )
}

export function calculatePrizeSummary(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  payments: StagePayment[],
  stageIds: StageId[],
): PrizeSummary {
  const paymentByStage = new Map(payments.map((payment) => [payment.stageId, payment]))
  const collected = payments.reduce(
    (sum, payment) => sum + payment.amount * payment.paidUserIds.length,
    0,
  )
  const stages = stageIds.map((stageId) => {
    const configuredPrize = Math.max(0, paymentByStage.get(stageId)?.prizeAmount ?? 0)
    const rows = computeStandings(users, matches, predictions, stageId)
      .filter((row) => row.played > 0)
      .sort(compareForPrize)
    const winners = rows.length > 0 && rows[0].points > 0
      ? rows.filter((row) => compareForPrize(row, rows[0]) === 0)
      : []
    return {
      stageId,
      configuredPrize,
      winners,
      prizePerWinner: winners.length > 0 ? configuredPrize / winners.length : 0,
    }
  })
  const stagePrizes = stages.reduce((sum, stage) => sum + stage.configuredPrize, 0)
  return {
    collected,
    stagePrizes,
    finalPrize: Math.max(0, collected - stagePrizes),
    stages,
  }
}
