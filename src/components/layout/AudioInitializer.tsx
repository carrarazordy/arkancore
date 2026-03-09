import { useEffect, useCallback } from "react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useLocation } from "react-router-dom";
import { useSettingsStore } from "@/store/useSettingsStore";

export function AudioInitializer() {
    const { pathname } = useLocation();

    const handleInteraction = useCallback(() => {
        // Initialize AudioContext on first user interaction
        ArkanAudio.playFast('silent_start'); // Dummy sound to wake up engine
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    }, []);

    // Sync Audio Levels
    useEffect(() => {
        // Initial sync
        ArkanAudio.setAudioLevels(useSettingsStore.getState().audioLevels);

        // Subscribe to changes
        const unsub = useSettingsStore.subscribe((state) => {
            ArkanAudio.setAudioLevels(state.audioLevels);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        // Add listeners for interaction
        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);

        // Global hover sounds for interactive elements
        // We use event delegation on active elements
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, a, [role="button"], input, textarea, .interactive')) {
                // Debounce slightly or just play
                ArkanAudio.playHover();
            }
        };

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, a, [role="button"], .interactive')) {
                ArkanAudio.playClick();
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('click', handleClick);
        };
    }, [handleInteraction]);

    // Play route change sound
    useEffect(() => {
        if (pathname !== '/login') {
            ArkanAudio.playFast('shimmer');
        }
    }, [pathname]);

    return null;
}
