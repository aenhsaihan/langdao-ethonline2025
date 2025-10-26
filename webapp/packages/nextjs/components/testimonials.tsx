import { cn } from "~~/lib/utils";
import Marquee from "./ui/marquee";
import { InteractiveGridPattern } from "./ui/interactive-grid-pattern";

const reviews = [
    {
        name: "Maria Rodriguez",
        username: "@maria_es",
        body: "Found my perfect Spanish tutor in seconds! The pay-per-second model is genius - no more wasted subscription fees.",
        img: "https://avatar.vercel.sh/maria",
    },
    {
        name: "Hiroshi Tanaka",
        username: "@hiroshi_jp",
        body: "As a Japanese tutor, LangDAO has transformed how I teach. Instant connections with motivated learners worldwide!",
        img: "https://avatar.vercel.sh/hiroshi",
    },
    {
        name: "Sophie Chen",
        username: "@sophie_fr",
        body: "Learning French has never been this engaging. Real conversations with native speakers - exactly what I needed!",
        img: "https://avatar.vercel.sh/sophie",
    },
    {
        name: "Ahmed Hassan",
        username: "@ahmed_ar",
        body: "The Web3 payments are seamless and secure. I love how transparent everything is on the blockchain.",
        img: "https://avatar.vercel.sh/ahmed",
    },
    {
        name: "Emma Thompson",
        username: "@emma_en",
        body: "Teaching English on LangDAO is incredibly rewarding. The platform makes it so easy to connect with students.",
        img: "https://avatar.vercel.sh/emma",
    },
    {
        name: "Carlos Silva",
        username: "@carlos_pt",
        body: "Finally, a language learning platform that respects my time and budget. Pay only for what you use!",
        img: "https://avatar.vercel.sh/carlos",
    },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

const ReviewCard = ({
    img,
    name,
    username,
    body,
}: {
    img: string;
    name: string;
    username: string;
    body: string;
}) => {
    return (
        <figure
            className={cn(
                "relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
                // light styles
                "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
                // dark styles
                "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
            )}
        >
            <div className="flex flex-row items-center gap-2">
                <img className="rounded-full" width="32" height="32" alt="" src={img} />
                <div className="flex flex-col">
                    <figcaption className="text-sm font-medium dark:text-white">
                        {name}
                    </figcaption>
                    <p className="text-xs font-medium dark:text-white/40">{username}</p>
                </div>
            </div>
            <blockquote className="mt-2 text-sm">{body}</blockquote>
        </figure>
    );
};

export function TestimonialsSection() {
    return (
        <div className="relative py-16 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <InteractiveGridPattern
                width={60}
                height={60}
                squares={[32, 16]}
                className="opacity-20 dark:opacity-30"
                squaresClassName="stroke-gray-400/20 dark:stroke-gray-400/40"
            />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        What Our Community Says
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Join thousands of learners and tutors who are already transforming their language journey with LangDAO
                    </p>
                </div>

                {/* Marquee Reviews */}
                <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
                    <Marquee pauseOnHover className="[--duration:20s]">
                        {firstRow.map((review) => (
                            <ReviewCard key={review.username} {...review} />
                        ))}
                    </Marquee>
                    <Marquee reverse pauseOnHover className="[--duration:20s]">
                        {secondRow.map((review) => (
                            <ReviewCard key={review.username} {...review} />
                        ))}
                    </Marquee>
                    <div className="from-gray-50 dark:from-gray-900 pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
                    <div className="from-gray-50 dark:from-gray-900 pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
                </div>
            </div>
        </div>
    );
}