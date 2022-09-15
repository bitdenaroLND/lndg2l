export const roundToNearest = (numberToRound, desiredDecimals) => {
  desiredDecimals = desiredDecimals || 0
  const p = Math.pow(10, desiredDecimals)
  const n = (numberToRound * p) * (1 + Number.EPSILON)
  return Math.round(n) / p
}
