export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-card border border-border rounded-lg shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}