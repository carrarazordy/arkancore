import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDialogStore } from "@/store/useDialogStore";
import { useSearchStore } from "@/store/useSearchStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isTextInput(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function isElementVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function getFocusableElements() {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isElementVisible);
}

function getCenter(rect: DOMRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function findNextElement(current: HTMLElement | null, direction: "up" | "down" | "left" | "right") {
  const elements = getFocusableElements();
  if (!elements.length) {
    return null;
  }

  if (!current || !elements.includes(current)) {
    return elements[0];
  }

  const currentRect = current.getBoundingClientRect();
  const currentCenter = getCenter(currentRect);

  return elements
    .filter((element) => element !== current)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const center = getCenter(rect);
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      const isCandidate =
        direction === "up"
          ? dy < -4
          : direction === "down"
            ? dy > 4
            : direction === "left"
              ? dx < -4
              : dx > 4;

      if (!isCandidate) {
        return null;
      }

      const primary = direction === "up" || direction === "down" ? Math.abs(dy) : Math.abs(dx);
      const cross = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);

      return { element, score: primary + cross * 0.65 };
    })
    .filter(Boolean)
    .sort((left, right) => left!.score - right!.score)[0]?.element ?? current;
}

export function KeyboardSelectionController() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDialogOpen = useDialogStore((state) => state.isOpen);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isSearchOpen = useSearchStore((state) => state.isOpen);
  const toggleSearch = useSearchStore((state) => state.toggleSearch);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "Escape") {
        if (isSearchOpen) {
          event.preventDefault();
          toggleSearch(false);
          ArkanAudio.playFast("clack");
          return;
        }

        if (isDialogOpen) {
          event.preventDefault();
          closeDialog();
          ArkanAudio.playFast("clack");
          return;
        }

        if (!isTextInput(event.target) && pathname !== "/dashboard" && pathname !== "/") {
          event.preventDefault();
          navigate(-1);
          ArkanAudio.playBack();
        }
        return;
      }

      if (isTextInput(event.target)) {
        return;
      }

      const directionByKey: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };

      const direction = directionByKey[event.key];
      if (direction) {
        const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const nextElement = findNextElement(activeElement, direction);

        if (nextElement) {
          event.preventDefault();
          nextElement.focus({ preventScroll: false });
          nextElement.setAttribute("data-keyboard-selected", "true");
          window.setTimeout(() => nextElement.removeAttribute("data-keyboard-selected"), 450);
          ArkanAudio.playFast("key_tick");
        }
        return;
      }

      if (event.key === "Enter" && document.activeElement instanceof HTMLElement) {
        const activeElement = document.activeElement;
        if (activeElement.matches(FOCUSABLE_SELECTOR)) {
          event.preventDefault();
          activeElement.click();
          ArkanAudio.playEnter();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, isDialogOpen, isSearchOpen, navigate, pathname, toggleSearch]);

  return null;
}
