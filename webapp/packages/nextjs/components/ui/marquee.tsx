import { cn } from "~~/lib/utils";

interface MarqueeProps {
    className?: string;
    reverse?: boolean;
    pauseOnHover?: boolean;
    children?: React.ReactNode;
    vertical?: boolean;
    repeat?: number;
    [key: string]: any;
}

export default function Marquee({
    className,
    reverse,
    pauseOnHover = false,
    children,
    vertical = false,
    repeat = 4,
    ...props
}: MarqueeProps) {
    return (
        <div
            {...props}
            className={cn(
                "flex overflow-hidden p-2 gap-4 group",
                {
                    "flex-row": !vertical,
                    "flex-col": vertical,
                },
                className,
            )}
        >
            {Array(repeat)
                .fill(0)
                .map((_, i) => (
                    <div
                        key={i}
                        className={cn("flex shrink-0 gap-4", {
                            "flex-row animate-marquee": !vertical && !reverse,
                            "flex-row animate-marquee-reverse": !vertical && reverse,
                            "flex-col animate-marquee-vertical": vertical && !reverse,
                            "flex-col animate-marquee-vertical-reverse": vertical && reverse,
                            "group-hover:[animation-play-state:paused]": pauseOnHover,
                        })}
                    >
                        {children}
                    </div>
                ))}
        </div>
    );
}