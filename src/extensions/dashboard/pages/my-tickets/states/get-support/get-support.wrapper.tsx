import { useState } from 'react';
import {
    Box,
    Button,
    Card,
    Dropdown,
    FormField,
    Input,
    InputArea,
    Page,
    Tabs,
    Text,
} from '@wix/design-system';
import { useGetSupport, type SupportRequestType } from './useGetSupport';

const requestTabs = [
    { id: 'support', title: 'Get help' },
    { id: 'bug', title: 'Report a bug' },
    { id: 'feature', title: 'Suggest a feature' },
    { id: 'feedback', title: 'Share feedback' },
];

const priorities = [
    { id: 'low', value: 'Low' },
    { id: 'normal', value: 'Normal' },
    { id: 'high', value: 'High' },
    { id: 'urgent', value: 'Urgent' },
];

const GetSupportWrapper = () => {
    const { submitBugReport, submitFeatureRequest, submitFeedback, submitSupportRequest } = useGetSupport();
    const [requestType, setRequestType] = useState<SupportRequestType>('support');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('normal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionMessage, setSubmissionMessage] = useState('');

    const requestLabel = {
        support: 'Support request',
        bug: 'Bug report',
        feature: 'Feature request',
        feedback: 'Feedback',
    }[requestType];

    const submitRequest = async () => {
        setIsSubmitting(true);
        setSubmissionMessage('');

        const details = {
            type: requestType,
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
            ...(requestType === 'support' ? { priority } : {}),
        };

        try {
            if (requestType === 'bug') await submitBugReport(details);
            else if (requestType === 'feature') await submitFeatureRequest(details);
            else if (requestType === 'feedback') await submitFeedback(details);
            else await submitSupportRequest(details);
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
            setPriority('normal');
            setSubmissionMessage('Your request was submitted.');
        } catch (error) {
            setSubmissionMessage(error instanceof Error ? error.message : 'Unable to submit your request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const changeRequestType = (id: string) => {
        setRequestType(id as SupportRequestType);
        setSubmissionMessage('');
    };

    return (
        <Page maxWidth={9999} className="get-support-page">
            <Page.Header title="Get Support" subtitle="Tell us how we can help. Choose a topic and send us the details." />
            <Page.Content>
                <Box direction="vertical" gap={4} width="100%">
                    <Card>
                        <Card.Content>
                            <Box direction="vertical" gap={3}>
                                <Text weight="bold">What do you need help with?</Text>
                                <Tabs
                                    items={requestTabs}
                                    activeId={requestType}
                                    onClick={(item) => changeRequestType(String(item.id))}
                                />
                                <Text secondary>
                                    {requestType === 'support' && 'Ask a question or get help with your account.'}
                                    {requestType === 'bug' && 'Tell us what went wrong and how to reproduce it.'}
                                    {requestType === 'feature' && 'Share an idea that would improve your workflow.'}
                                    {requestType === 'feedback' && 'Let us know what is working well or what could be better.'}
                                </Text>
                            </Box>
                        </Card.Content>
                    </Card>

                    <Card>
                        <Card.Header title={requestLabel} subtitle="We’ll use your contact details to follow up about this request." />
                        <Card.Content>
                            <Box direction="vertical" gap={3}>
                                <FormField label="Your name" required>
                                    <Input value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Enter your name" />
                                </FormField>
                                <FormField label="Email address" required>
                                    <Input value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="you@example.com" type="email" />
                                </FormField>
                                <FormField label="Subject" required>
                                    <Input value={subject} onChange={(event) => setSubject(event.currentTarget.value)} placeholder="Briefly describe your request" />
                                </FormField>
                                {requestType === 'support' && (
                                    <FormField label="Priority">
                                        <Dropdown
                                            options={priorities}
                                            selectedId={priority}
                                            onSelect={(option) => setPriority(String(option.id))}
                                        />
                                    </FormField>
                                )}
                                <FormField label={requestType === 'bug' ? 'What happened?' : 'Details'} required>
                                    <InputArea
                                        value={message}
                                        onChange={(event) => setMessage(event.currentTarget.value)}
                                        placeholder={requestType === 'bug'
                                            ? 'Include the steps you took and what you expected to happen.'
                                            : 'Add any details that will help us understand your request.'}
                                        minHeight="140px"
                                    />
                                </FormField>
                                <Box direction="horizontal" gap={3} verticalAlign="middle">
                                    <Button
                                        onClick={submitRequest}
                                        disabled={isSubmitting || !name.trim() || !email.trim() || !subject.trim() || !message.trim()}
                                    >
                                        {isSubmitting ? 'Submitting…' : 'Submit request'}
                                    </Button>
                                    {submissionMessage && <Text>{submissionMessage}</Text>}
                                </Box>
                            </Box>
                        </Card.Content>
                    </Card>
                </Box>
            </Page.Content>
        </Page>
    );
};

export default GetSupportWrapper;


