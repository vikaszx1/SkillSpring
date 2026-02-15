interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-12 h-12 border-[3px]",
};

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`${sizes[size]} border-gray-200 border-t-primary-600 rounded-full animate-spin ${className}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}
