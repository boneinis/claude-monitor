export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatPercentage(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTokensWithBonus(used: number, limit: number): string {
  if (used > limit) {
    const bonus = used - limit;
    return `${formatNumber(limit)} + ${formatNumber(bonus)} bonus`;
  }
  return `${formatNumber(used)} / ${formatNumber(limit)}`;
}

export function formatUsagePercentage(used: number, limit: number): string {
  const percentage = (used / limit) * 100;
  if (percentage > 100) {
    const bonusPercentage = percentage - 100;
    return `${formatPercentage(percentage)} (+${formatPercentage(bonusPercentage)} bonus)`;
  }
  return formatPercentage(percentage);
}