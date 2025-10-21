import { cn } from "~~/lib/utils";

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AuroraText({ children, className }: AuroraTextProps) {
  return (
    <span
      className={cn(
        "inline-block bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-[length:200%_200%] bg-clip-text text-transparent animate-aurora",
        className
      )}
    >
      {children}
    </span>
  );
}