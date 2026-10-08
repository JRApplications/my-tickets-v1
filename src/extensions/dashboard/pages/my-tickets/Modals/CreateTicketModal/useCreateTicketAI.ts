import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';

export const useCreateTicketAI = () => {
    const baseApiUrl = new URL(import.meta.url).origin;

    const generateTicketSubject = async (description: string) => {
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/createTicketAi/generate-ticket-subject`, {
                method: 'POST',
                body: JSON.stringify({ description }),
            });
            const result = await response.json(); 
            return result.generatedSubject;
        } catch (error: any) {
            console.error("Error generating ticket subject:", error);
        }
    };

    const improveTicketDescription = async (description: string) => {
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/createTicketAi/improve-ticket-description`, {
                method: 'POST',
                body: JSON.stringify({ description }),
            });
            const result = await response.json();
            return result.improvedDescription;
        } catch (error: any) {
            console.error("Error improving ticket description:", error);
        }
    };

    const generateTicketTags = async (subject: string, description: string) => {
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/createTicketAi/generate-ticket-tags`, {
                method: 'POST',
                body: JSON.stringify({ subject, description }),
            });
            const result = await response.json();
            return result.generatedTags;
        } catch (error: any) {
            console.error("Error generating ticket tags:", error);
        }
    };

    return {
        generateTicketSubject,
        improveTicketDescription,
        generateTicketTags,
    };
};