import { useEffect, useCallback } from "react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useLocation } from "react-router-dom";
import { useSettingsStore } from "@/store/useSettingsStore";

export function AudioInitializer() {
    const { pathname } = useLocation();

    const handleInteraction = useCallback(() => {
        void ArkanAudio.unlock();
        ArkanAudio.playFast('silent_start');
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
        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);

        let lastHoverTarget: Element | null = null;

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const interactive = target.closest('button, a, [role="button"], input, textarea, select, .interactive');
            if (interactive && interactive !== lastHoverTarget) {
                lastHoverTarget = interactive;
                ArkanAudio.playHover();
            }
        };

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, a, [role="button"], input[type="checkbox"], input[type="radio"], select, .interactive')) {
                ArkanAudio.playClick();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            if (e.key === 'Escape' || e.key === 'Backspace') {
                ArkanAudio.playBack();
                return;
            }

            if (e.key === 'Enter') {
                ArkanAudio.playEnter();
                return;
            }

            ArkanAudio.typing(e);
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
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
