export function formatCompactNumber(num: number | string | undefined | null): string {
    const val = Number(num);
    if (isNaN(val)) return "0";
    
    // Only format if 5 digits or more (>= 10,000)
    if (Math.abs(val) >= 10000) {
        return new Intl.NumberFormat('en-US', {
            notation: "compact",
            compactDisplay: "short",
            maximumFractionDigits: 1
        }).format(val);
    }
    
    // Default formatting
    return new Intl.NumberFormat('en-US').format(val);
}
