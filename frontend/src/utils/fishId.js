export const formatFishIdForDisplay = (fishId) => {
  if (!fishId) return ''
  const value = String(fishId)
  return value.length <= 8 ? value : value.slice(-8)
}
