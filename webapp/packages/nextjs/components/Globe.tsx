"use client";

import { useEffect, useRef } from "react";
import createGlobe, { COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "motion/react";
import { cn } from "~~/lib/utils";

const MOVEMENT_DAMPING = 1400;

const LANGDAO_GLOBE_CONFIG: COBEOptions = {
    width: 800,
    height: 800,
    onRender: () => { },
    devicePixelRatio: 2,
    phi: 0,
    theta: 0.3,
    dark: 0,
    diffuse: 0.4,
    mapSamples: 16000,
    mapBrightness: 1.2,
    baseColor: [1, 1, 1],
    markerColor: [251 / 255, 100 / 255, 21 / 255],
    glowColor: [1, 1, 1],
    markers: [
        // Major language learning hubs around the world
        { location: [40.7128, -74.006], size: 0.1 }, // New York (English)
        { location: [51.5074, -0.1278], size: 0.08 }, // London (English)
        { location: [48.8566, 2.3522], size: 0.08 }, // Paris (French)
        { location: [41.9028, 12.4964], size: 0.07 }, // Rome (Italian)
        { location: [40.4168, -3.7038], size: 0.08 }, // Madrid (Spanish)
        { location: [19.4326, -99.1332], size: 0.09 }, // Mexico City (Spanish)
        { location: [-23.5505, -46.6333], size: 0.08 }, // São Paulo (Portuguese)
        { location: [52.5200, 13.4050], size: 0.07 }, // Berlin (German)
        { location: [35.6762, 139.6503], size: 0.09 }, // Tokyo (Japanese)
        { location: [39.9042, 116.4074], size: 0.1 }, // Beijing (Chinese)
        { location: [37.5665, 126.9780], size: 0.06 }, // Seoul (Korean)
        { location: [19.076, 72.8777], size: 0.08 }, // Mumbai (Hindi)
        { location: [55.7558, 37.6176], size: 0.07 }, // Moscow (Russian)
        { location: [33.6844, 73.0479], size: 0.05 }, // Islamabad (Urdu)
        { location: [30.0444, 31.2357], size: 0.06 }, // Cairo (Arabic)
    ],
};

export function Globe({
    className,
    config = LANGDAO_GLOBE_CONFIG,
}: {
    className?: string;
    config?: COBEOptions;
}) {
    let phi = 0;
    let width = 0;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef<number | null>(null);
    const pointerInteractionMovement = useRef(0);
    const r = useMotionValue(0);
    const rs = useSpring(r, {
        mass: 1,
        damping: 30,
        stiffness: 100,
    });

    const updatePointerInteraction = (value: number | null) => {
        pointerInteracting.current = value;
        if (canvasRef.current) {
            canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
        }
    };

    const updateMovement = (clientX: number) => {
        if (pointerInteracting.current !== null) {
            const delta = clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            r.set(r.get() + delta / MOVEMENT_DAMPING);
        }
    };

    useEffect(() => {
        const onResize = () => {
            if (canvasRef.current) {
                width = canvasRef.current.offsetWidth;
            }
        };
        window.addEventListener("resize", onResize);
        onResize();

        const globe = createGlobe(canvasRef.current!, {
            ...config,
            width: width * 2,
            height: width * 2,
            onRender: (state) => {
                if (!pointerInteracting.current) phi += 0.005;
                state.phi = phi + rs.get();
                state.width = width * 2;
                state.height = width * 2;
            },
        });

        setTimeout(() => (canvasRef.current!.style.opacity = "1"), 0);
        return () => {
            globe.destroy();
            window.removeEventListener("resize", onResize);
        };
    }, [rs, config]);

    return (
        <div
            className={cn(
                "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
                className
            )}
        >
            <canvas
                className={cn(
                    "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
                )}
                ref={canvasRef}
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX;
                    updatePointerInteraction(e.clientX);
                }}
                onPointerUp={() => updatePointerInteraction(null)}
                onPointerOut={() => updatePointerInteraction(null)}
                onMouseMove={(e) => updateMovement(e.clientX)}
                onTouchMove={(e) =>
                    e.touches[0] && updateMovement(e.touches[0].clientX)
                }
            />
        </div>
    );
}