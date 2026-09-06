export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 200 40" 
      className={`fill-blue-600 dark:fill-blue-400 ${className}`}
    >
      <text 
        x="0" 
        y="30" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="32" 
        fontWeight="800"
        letterSpacing="-1"
      >
        Bajwa<tspan fill="currentColor" opacity="0.6">Store</tspan>
      </text>
    </svg>
  );
}
