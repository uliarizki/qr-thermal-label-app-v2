import { useEffect, useRef } from 'react';

/**
 * Hook to manage browser history for Modals.
 * Ensures that pressing the "Back" button on Android/Browser closes the modal 
 * instead of navigating away.
 * 
 * @param {Function} onClose - Function to call when modal should close (state setter in parent)
 * @param {string} key - Unique identifier for this modal (e.g., 'batch-modal')
 * @returns {Function} handleManualClose - Use this function for "X" buttons or manual closes
 */
export const useModalHistory = (onClose, key = 'modal') => {
    // Check if we pushed state so we don't pop state we didn't push (if unmounted externally)
    const pushedStateRef = useRef(false);
    const onCloseRef = useRef(onClose);

    // Keep onCloseRef current
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        // 1. Push State on Mount
        // We add a unique flag to identify this modal level
        const currentState = window.history.state || {};
        // const url = new URL(window.location); // Original line, replaced by window.location directly

        // Add hash for visual clarity if needed, or just keep state
        // We won't change hash to avoid scrolling issues, just state

        // Prevent double pushing if React StrictMode double mounts? 
        // We can just rely on the cleanup to handle it, but safer to check.

        // Push new entry
        window.history.pushState(
            { ...currentState, modal: key },
            '',
            window.location
        );
        pushedStateRef.current = true;

        // 2. Listen for PopState (Back Button)
        const handlePopState = (event) => {
            // If the popped state does NOT have our key (meaning we went back), close.
            // Or if we went forward to a non-modal state? 
            // Simpler: If the event is triggered, it implies navigation.
            // Since we pushed a state, "Back" returns us to previous state.
            // We just need to sync the UI (close modal).

            // Critical: If we receive a popstate, we are NO LONGER in the modal state (browser side).
            // So we just need to ensure the UI closes.
            pushedStateRef.current = false; // We consumed the state
            if (onCloseRef.current) onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);

            // 3. Cleanup on Unmount (e.g. Parent closed us without history interaction)
            // If we are still "in" the modal state according to ref, we must back out.
            // This handles cases where parent force-closes (e.g. sync finish, or other external event)
            if (pushedStateRef.current) {
                // Check if current history state is actually ours before backing?
                // It's tricky to know exactly, but if we pushed, we should probably pop.
                // However, calling history.back() here during unmount might trigger another popstate?
                // NO, if we unmount, we removed the listener! So it's safe to back() without triggering loop.
                window.history.back();
            }
        };
    }, [key]);

    // 4. Manual Close Helper
    // If user clicks "X", we want to trigger the history back mechanism 
    // rather than just update state, so the history stack remains clean.
    const handleManualClose = () => {
        if (pushedStateRef.current) {
            window.history.back();
            // Listener will catch this and call onClose
        } else {
            // Fallback if something weird happened
            onClose();
        }
    };

    return handleManualClose;
};
