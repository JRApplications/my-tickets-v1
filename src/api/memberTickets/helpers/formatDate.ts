export const formatDate = (value: unknown): string => {
    let date: Date;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value);
    } else if (
        typeof value === 'object' &&
        value !== null &&
        '$date' in value &&
        typeof value.$date === 'string'
    ) {
        date = new Date(value.$date);
    } else {
        return '';
    }
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
}