// Type declaration for Google Analytics gtag
declare function gtag(...args: unknown[]): void;

export function trackAchievementUnlock(
  id: string,
  name: string,
  tier: string
): void {
  if (typeof gtag === 'function') {
    gtag('event', 'achievement_unlock', {
      achievement_id: id,
      achievement_name: name,
      achievement_tier: tier,
    });
  }
}
