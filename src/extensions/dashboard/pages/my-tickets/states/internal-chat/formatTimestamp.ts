const ONE_MINUTE_MS = 60_000;
const ONE_DAY_MS = 86_400_000;
const DAYS_IN_WEEK = 7;

export const formatTimestamp = (timestamp?: number | string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();

    if (now.getTime() - date.getTime() < ONE_MINUTE_MS) return 'Just now';

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfDay.getTime()) / ONE_DAY_MS);

    if (diffDays === 0) return `Today at ${time}`;
    if (diffDays === 1) return `Yesterday at ${time}`;
    if (diffDays < DAYS_IN_WEEK) return `${date.toLocaleDateString([], { weekday: 'short' })} at ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${time}`;
};
