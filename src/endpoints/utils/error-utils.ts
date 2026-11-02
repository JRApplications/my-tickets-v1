/**
 * Safely extract a meaningful error message from any error type
 * Handles Wix API errors, standard Error objects, and plain objects
 */
export function extractErrorMessage(error: unknown): string {
    if (!error) {
        return 'Unknown error';
    }

    // Handle standard Error objects
    if (error instanceof Error) {
        return error.message;
    }

    // Handle plain objects (including Wix API errors)
    if (typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;

        // Wix API errors have nested structure
        const details = errorObj.details as Record<string, unknown> | undefined;
        if (details?.applicationError) {
            const appError = details.applicationError as Record<string, unknown>;
            const description = appError.description as string | undefined;
            if (description) {
                return description;
            }
        }

        // Try message property
        if (errorObj.message && typeof errorObj.message === 'string') {
            return errorObj.message;
        }

        // Try description property
        if (errorObj.description && typeof errorObj.description === 'string') {
            return errorObj.description;
        }

        // Try error property
        if (errorObj.error && typeof errorObj.error === 'string') {
            return errorObj.error;
        }

        // Fallback to stringified object
        try {
            return JSON.stringify(errorObj);
        } catch {
            return 'Unknown error';
        }
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    // Fallback
    return String(error);
}
