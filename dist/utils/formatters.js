"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatNumber = formatNumber;
exports.formatPercentage = formatPercentage;
exports.formatDuration = formatDuration;
exports.formatDate = formatDate;
exports.formatTokensWithBonus = formatTokensWithBonus;
exports.formatUsagePercentage = formatUsagePercentage;
function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
}
function formatNumber(num) {
    return num.toLocaleString();
}
function formatPercentage(percent) {
    return `${percent.toFixed(1)}%`;
}
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    else {
        return `${seconds}s`;
    }
}
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function formatTokensWithBonus(used, limit) {
    if (used > limit) {
        const bonus = used - limit;
        return `${formatNumber(limit)} + ${formatNumber(bonus)} bonus`;
    }
    return `${formatNumber(used)} / ${formatNumber(limit)}`;
}
function formatUsagePercentage(used, limit) {
    const percentage = (used / limit) * 100;
    if (percentage > 100) {
        const bonusPercentage = percentage - 100;
        return `${formatPercentage(percentage)} (+${formatPercentage(bonusPercentage)} bonus)`;
    }
    return formatPercentage(percentage);
}
//# sourceMappingURL=formatters.js.map