
export const formatDate = (dateString: any): string => {
    const date = new Date(dateString.$date);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
}