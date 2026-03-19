export interface OnboardingProfile {
  handle: string;
  focusModule: 'operations' | 'archive' | 'chronos';
  accessKeyConfigured: boolean;
  completedAt: string;
}

const ONBOARDING_VERSION = 'v1';

function getStorageKey(userId: string) {
  return `arkan:onboarding:${ONBOARDING_VERSION}:${userId}`;
}

export function loadOnboardingProfile(userId: string): OnboardingProfile | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

export function hasCompletedOnboarding(userId: string): boolean {
  const profile = loadOnboardingProfile(userId);
  return Boolean(profile?.completedAt);
}

export function saveOnboardingProfile(userId: string, profile: OnboardingProfile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(profile));
}
