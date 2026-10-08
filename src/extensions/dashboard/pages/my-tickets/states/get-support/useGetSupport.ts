import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';

export type SupportRequestType = 'support' | 'bug' | 'feature' | 'feedback';

export interface SupportRequestDetails {
    type: SupportRequestType;
    name: string;
    email: string;
    subject: string;
    message: string;
    priority?: string;
}

export const useGetSupport = () => {
    const submit = async (details: SupportRequestDetails) => {
        const baseApiUrl = new URL(import.meta.url).origin;

        const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/get-support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        const result = await response.json() as { success?: boolean; error?: string };

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Unable to submit your request. Please try again.');
        }
    };

    return {
        submitBugReport: (details: SupportRequestDetails) => submit(details),
        submitFeatureRequest: (details: SupportRequestDetails) => submit(details),
        submitFeedback: (details: SupportRequestDetails) => submit(details),
        submitSupportRequest: (details: SupportRequestDetails) => submit(details),
    };
};
