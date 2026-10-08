import { useState } from 'react';
import { Box, CustomModalLayout, FormField, Input, Loader, Modal, Text } from '@wix/design-system';
import { httpClient } from '@wix/essentials';
import { storeMyTicketsAgentSession } from '../auth/myTicketsFetchWithAuth';
import type { LoginSuccessData } from '../login';

const baseApiUrl = new URL(import.meta.url).origin;

export function MainAdminOnboardingModal({ isOpen, onComplete }: { isOpen: boolean; onComplete: (user: LoginSuccessData) => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const createAccount = async () => {
        setError('');
        setIsSaving(true);
        try {
            const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/onboarding/create-main-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Setup failed. Please try again.');

            storeMyTicketsAgentSession(result.authToken, result.authTokenExpiresAt, false);
            onComplete({ ...result.user, authToken: result.authToken });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Setup failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen}>
            <CustomModalLayout
                title={<CustomModalLayout.Title>Set up My Tickets</CustomModalLayout.Title>}
                subtitle="Create your main administrator account to get started. This account will have access to every feature."
                primaryButtonText={isSaving ? <Loader size="tiny" /> : 'Create administrator'}
                primaryButtonProps={{ onClick: createAccount, disabled: isSaving || !name.trim() || !email.trim() || password.length < 8 }}
                showHeaderDivider
                showFooterDivider
            >
                <Box direction="vertical" gap={2}>
                    <FormField label="Your name" required>
                        <Input value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} autoFocus />
                    </FormField>
                    <FormField label="Email" required>
                        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSaving} />
                    </FormField>
                    <FormField label="Password" required>
                        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSaving} />
                    </FormField>
                    <Text size="small">Use at least 8 characters. We'll also create the administrator role and your default team.</Text>
                    {error && <Text skin="error">{error}</Text>}
                </Box>
            </CustomModalLayout>
        </Modal>
    );
}

export async function checkNeedsOnboarding(): Promise<boolean> {
    const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/onboarding/status`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not check onboarding status');
    return result.needsSetup === true;
}
