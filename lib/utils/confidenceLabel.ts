export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  if (confidence >= 0.3) return 'low';
  return 'unknown';
}

export function getConfidenceLabel(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  return { high: '高精度', medium: '中程度', low: '低精度', unknown: '不明' }[level];
}

export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  return {
    high: 'text-green-700 bg-green-50',
    medium: 'text-yellow-700 bg-yellow-50',
    low: 'text-red-700 bg-red-50',
    unknown: 'text-gray-600 bg-gray-100',
  }[level];
}
