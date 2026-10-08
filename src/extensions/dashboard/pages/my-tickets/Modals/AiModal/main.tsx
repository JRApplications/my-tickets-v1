import {
    Box,
    Button,
    IconButton,
    Input,
    Text,
    Badge,
    Card,
    Divider,
    CopyClipboard,
    Tooltip
} from '@wix/design-system';
import { useState, useEffect } from 'react';
import {
    SparklesFilled,
    NewChat,
    Copy,
} from '@wix/wix-ui-icons-common/odeditor';
import {
    X,
    Check
} from '@wix/wix-ui-icons-common';
import './main.css';
import { MessageWrapper } from './messageWrapper';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { ToolUI } from './toolForm';

interface ConversationMessage {
    message: string;
    userType: 'ai' | 'user';
    skill?: string | null;
    subSkill?: string | null;
    skills?: string[] | null;
    tool?: string | null;
    toolApprovalRequired?: boolean;
    toolArguments?: unknown;
    ui?: ToolUI | null;
    feedback?: 'helpful' | 'unhelpful' | null;
}

interface GenerateResponse {
    text?: string;
    skill?: string | null;
    subSkill?: string | null;
    skills?: string[] | null;
    tool?: string | null;
    toolApprovalRequired?: boolean;
    toolArguments?: unknown;
    arguments?: Record<string, unknown>;
    ui?: ToolUI | null;
    error?: string;
}

interface ProgressEvent {
    type: 'progress';
    message: string;
}

interface CompleteEvent {
    type: 'complete';
    data: GenerateResponse;
}

interface ErrorEvent {
    type: 'error';
    message: string;
}

type GenerationEvent =
    | ProgressEvent
    | CompleteEvent
    | ErrorEvent;

interface ToolExecuteResponse {
    success?: boolean;
    tool?: string;
    status?: number;
    data?: unknown;
    error?: string;
}

/**
 * Progress text comes from the backend AI.
 * The frontend only removes protocol/display formatting accidentally
 * included in the streamed message.
 */
const cleanProgressMessage = (
    value: string,
): string => {
    return value
        .replace(/^\s*(?:progress|status|update|task)\s*:\s*/i, '')
        .replace(/\s*\.{2,}\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const readStreamResponse = async (
    response: Response,
    onProgress: (message: string) => void,
): Promise<GenerateResponse> => {
    const contentType =
        response.headers.get('content-type') ?? '';

    if (!contentType.includes('text/event-stream')) {
        return (await response.json()) as GenerateResponse;
    }

    if (!response.body) {
        throw new Error('The AI response stream was unavailable.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let completed: GenerateResponse | null = null;

    const consumeBlock = (block: string) => {
        const dataLines = block
            .split('\n')
            .filter((line) =>
                line.startsWith('data:'),
            )
            .map((line) =>
                line.slice(5).trim(),
            );

        if (dataLines.length === 0) {
            return;
        }

        const rawData = dataLines.join('\n');

        let event: GenerationEvent;

        try {
            event = JSON.parse(
                rawData,
            ) as GenerationEvent;
        } catch {
            throw new Error(
                'Received an invalid AI progress event.',
            );
        }

        if (event.type === 'progress') {
            const cleanedMessage =
                cleanProgressMessage(
                    event.message,
                );

            if (cleanedMessage) {
                onProgress(cleanedMessage);
            }

            return;
        }

        if (event.type === 'error') {
            throw new Error(
                event.message ||
                'AI generation failed.',
            );
        }

        completed = event.data;
    };

    try {
        while (true) {
            const {
                value,
                done,
            } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(
                value,
                { stream: true },
            );

            buffer = buffer.replace(
                /\r\n/g,
                '\n',
            );

            let separatorIndex =
                buffer.indexOf('\n\n');

            while (
                separatorIndex !== -1
            ) {
                const block =
                    buffer.slice(
                        0,
                        separatorIndex,
                    );

                buffer =
                    buffer.slice(
                        separatorIndex + 2,
                    );

                consumeBlock(block);

                separatorIndex =
                    buffer.indexOf('\n\n');
            }
        }

        buffer += decoder.decode();
        buffer = buffer.replace(
            /\r\n/g,
            '\n',
        );

        if (buffer.trim()) {
            consumeBlock(buffer);
        }

        if (!completed) {
            throw new Error(
                'The AI ended the response without a result.',
            );
        }

        return completed;
    } finally {
        reader.releaseLock();
    }
};

export const AiModal = ({
    isOpen,
    onClose,
    agentName,
    logoUrl,
    state
}: {
    isOpen: boolean;
    onClose: () => void;
    agentName: string;
    logoUrl: string;
    state: string;
}) => {
    // Escape-to-dismiss: this panel isn't built on WDS's Modal/Drawer/SidePanel,
    // so none of the accessibility behavior those provide (focus trap, Escape,
    // aria-modal) comes for free here. This restores at least Escape-to-close.
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const [
        conversation,
        setConversation,
    ] = useState<ConversationMessage[]>(
        [],
    );

    const [
        conversationId,
        setConversationId,
    ] = useState(() =>
        crypto.randomUUID(),
    );

    const [
        userInput,
        setUserInput,
    ] = useState('');

    const [
        generating,
        setGenerating,
    ] = useState(false);

    const [
        generationStartedAt,
        setGenerationStartedAt,
    ] = useState<number | null>(
        null,
    );

    const [
        generationStatus,
        setGenerationStatus,
    ] = useState('');

    const persistConversation = async (
        messages: ConversationMessage[],
    ) => {
        try {
            const baseApiUrl =
                new URL(import.meta.url)
                    .origin;

            await myTicketsFetchWithAuth(
                `${baseApiUrl}/api/sidebar-ai/sendMessageToConversationHistoryEndpoint`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        conversation_id:
                            conversationId,
                        messages:
                            messages.map(
                                (message) => ({
                                    role:
                                        message.userType ===
                                            'user'
                                            ? 'user'
                                            : 'assistant',
                                    content:
                                        message.message,
                                    skill:
                                        message.skill ??
                                        null,
                                    subSkill:
                                        message.subSkill ??
                                        null,
                                    skills:
                                        message.skills ??
                                        null,
                                    tool:
                                        message.tool ??
                                        null,
                                    ...(message.feedback
                                        ? {
                                            feedback:
                                                message.feedback,
                                        }
                                        : {}),
                                }),
                            ),
                    }),
                },
            );
        } catch (error) {
            // Conversation persistence must never interrupt
            // the existing AI flow.
            console.error(
                'AI conversation persistence failed:',
                error,
            );
        }
    };

    const handleSend = async () => {
        const promptText =
            userInput.trim();

        if (
            !promptText ||
            generating
        ) {
            return;
        }

        setConversation((prev) => [
            ...prev,
            {
                message: promptText,
                userType: 'user',
            },
        ]);

        setUserInput('');

        // Immediate frontend state while waiting
        // for the first AI-generated progress event.
        setGenerationStatus(
            'Working on it',
        );

        setGenerationStartedAt(
            Date.now(),
        );

        setGenerating(true);

        try {
            const baseApiUrl =
                new URL(import.meta.url)
                    .origin;

            const response =
                await myTicketsFetchWithAuth(
                    `${baseApiUrl}/api/sidebar-ai/generate`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            prompt: promptText,
                            state,
                            conversation: [
                                ...conversation.map(
                                    (message) => ({
                                        role:
                                            message.userType === 'user'
                                                ? 'user'
                                                : 'assistant',
                                        content:
                                            message.message,
                                        skill:
                                            message.skill ??
                                            null,
                                        subSkill:
                                            message.subSkill ??
                                            null,
                                        skills:
                                            message.skills ??
                                            null,
                                    }),
                                ),
                                {
                                    role: 'user',
                                    content: promptText,
                                    skill: null,
                                    subSkill: null,
                                    skills: null,
                                },
                            ],
                        }),
                    },
                );

            if (!response.ok) {
                const errorData =
                    (await response.json()) as GenerateResponse;

                throw new Error(
                    errorData.error ||
                    'AI generation failed',
                );
            }

            const data =
                await readStreamResponse(
                    response,
                    setGenerationStatus,
                );

            if (
                typeof data.text !==
                'string' ||
                !data.text.trim()
            ) {
                throw new Error(
                    'AI returned an empty response',
                );
            }

            const assistantMessage: ConversationMessage = {
                message:
                    data.text!,
                userType: 'ai',
                skill:
                    data.skill ??
                    null,
                subSkill:
                    data.subSkill ??
                    null,
                skills:
                    data.skills ??
                    null,
                tool:
                    data.tool ??
                    null,
                toolApprovalRequired:
                    data.toolApprovalRequired ??
                    false,
                toolArguments:
                    data.toolArguments,
                ui:
                    data.ui ??
                    null,
            };

            const nextConversation = [
                ...conversation,
                {
                    message: promptText,
                    userType: 'user' as const,
                },
                assistantMessage,
            ];

            setConversation(nextConversation);
            await persistConversation(
                nextConversation,
            );
        } catch (error) {
            console.error(
                'AI request failed:',
                error,
            );

            const errorMessage: ConversationMessage = {
                message:
                    error instanceof Error
                        ? error.message
                        : 'Something went wrong. Please try again.',
                userType: 'ai',
            };

            const nextConversation = [
                ...conversation,
                {
                    message: promptText,
                    userType: 'user' as const,
                },
                errorMessage,
            ];

            setConversation(nextConversation);
            await persistConversation(
                nextConversation,
            );
        } finally {
            setGenerating(false);
            setGenerationStartedAt(null);
            setGenerationStatus('');
        }
    };

    const handleToolSubmit = async (
        messageIndex: number,
        tool: string,
        values: Record<string, string>,
    ) => {
        if (generating) {
            return;
        }

        const submittedForm =
            conversation[
            messageIndex
            ];

        const ui =
            submittedForm?.ui;

        if (!submittedForm) {
            console.error(
                'Tool submission failed: message not found',
                {
                    messageIndex,
                    tool,
                },
            );

            return;
        }

        const submittedLines =
            ui?.fields
                .map((field) => {
                    const value =
                        values[field.name];

                    if (
                        value ===
                        undefined ||
                        value.trim() === ''
                    ) {
                        return null;
                    }

                    let displayValue =
                        value;

                    if (
                        field.type ===
                        'select'
                    ) {
                        const selectedOption =
                            field.options?.find(
                                (
                                    option,
                                ) =>
                                    option.value ===
                                    value,
                            );

                        if (
                            selectedOption
                        ) {
                            displayValue =
                                selectedOption.label;
                        }
                    }

                    return `- **${field.label}:** ${displayValue}`;
                })
                .filter(
                    (
                        line,
                    ): line is string =>
                        line !== null,
                )
                .join('\n');

        const submittedMessage =
            submittedLines
                ? `### ${ui?.title ?? 'Submitted details'}\n\n${submittedLines}`
                : 'Form submitted.';

        const updatedConversation =
            conversation.map(
                (
                    message,
                    index,
                ) =>
                    index ===
                        messageIndex
                        ? {
                            ...message,
                            ui: null,
                        }
                        : message,
            );

        updatedConversation.push({
            message:
                submittedMessage,
            userType: 'user',
            skill:
                submittedForm.skill ??
                null,
            subSkill:
                submittedForm.subSkill ??
                null,
            skills:
                submittedForm.skills ??
                null,
        });

        setConversation(
            updatedConversation,
        );

        // Immediate frontend state while waiting
        // for the first AI-generated progress event.
        setGenerationStatus(
            'Working on it',
        );

        setGenerationStartedAt(
            Date.now(),
        );

        setGenerating(true);

        try {
            const baseApiUrl =
                new URL(import.meta.url)
                    .origin;

            const executeResponse =
                await myTicketsFetchWithAuth(
                    `${baseApiUrl}/api/sidebar-ai/tools/execute`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            tool,
                            arguments: values,
                        }),
                    },
                );

            const executeData =
                (await executeResponse.json()) as ToolExecuteResponse;

            if (!executeResponse.ok) {
                throw new Error(
                    executeData.error ||
                    'Tool execution failed',
                );
            }

            const resultResponse =
                await myTicketsFetchWithAuth(
                    `${baseApiUrl}/api/sidebar-ai/generate`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            mode: 'tool-result',
                            tool,
                            skill:
                                submittedForm.skill ??
                                null,
                            subSkill:
                                submittedForm.subSkill ??
                                null,
                            skills:
                                submittedForm.skills ??
                                null,
                            toolResult:
                                executeData.data ??
                                executeData,
                            conversation:
                                updatedConversation.map(
                                    (
                                        message,
                                    ) => ({
                                        role:
                                            message.userType === 'user'
                                                ? 'user'
                                                : 'assistant',
                                        content:
                                            message.message,
                                        skill:
                                            message.skill ??
                                            null,
                                        subSkill:
                                            message.subSkill ??
                                            null,
                                        skills:
                                            message.skills ??
                                            null,
                                    }),
                                ),
                        }),
                    },
                );

            if (!resultResponse.ok) {
                const errorData =
                    (await resultResponse.json()) as GenerateResponse;

                throw new Error(
                    errorData.error ||
                    'Failed to generate tool result response',
                );
            }

            const resultData =
                await readStreamResponse(
                    resultResponse,
                    setGenerationStatus,
                );

            if (
                typeof resultData.text !==
                'string' ||
                !resultData.text.trim()
            ) {
                throw new Error(
                    'AI returned an empty tool result response',
                );
            }

            const assistantMessage: ConversationMessage = {
                message:
                    resultData.text!,
                userType: 'ai',
                skill:
                    resultData.skill ??
                    submittedForm.skill ??
                    null,
                subSkill:
                    resultData.subSkill ??
                    submittedForm.subSkill ??
                    null,
                skills:
                    resultData.skills ??
                    submittedForm.skills ??
                    null,
                tool:
                    resultData.tool ??
                    tool,
                ui: null,
            };

            const nextConversation = [
                ...updatedConversation,
                assistantMessage,
            ];

            setConversation(nextConversation);
            await persistConversation(
                nextConversation,
            );
        } catch (error) {
            console.error(
                'Tool execution failed:',
                error,
            );

            const errorMessage: ConversationMessage = {
                message:
                    error instanceof
                        Error
                        ? error.message
                        : 'Something went wrong while executing the tool.',
                userType: 'ai',
                tool,
                ui: null,
            };

            const nextConversation = [
                ...updatedConversation,
                errorMessage,
            ];

            setConversation(nextConversation);
            await persistConversation(
                nextConversation,
            );
        } finally {
            setGenerating(false);
            setGenerationStartedAt(null);
            setGenerationStatus('');
        }
    };

    const handleFeedback = async (
        messageIndex: number,
        feedback: 'helpful' | 'unhelpful' | null,
    ) => {
        const nextConversation =
            conversation.map(
                (message, index) =>
                    index === messageIndex
                        ? {
                            ...message,
                            feedback,
                        }
                        : message,
            );

        setConversation(nextConversation);
        await persistConversation(
            nextConversation,
        );
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Box
            className="ai-help-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${agentName || 'AI Assistant'} panel`}
        >
            <Box
                width="100%"
                height="100%"
                direction="vertical"
                boxSizing="border-box"
            >
                <Card
                    className="ai-help-modal-card"
                    stretchVertically
                    hideOverflow
                    showShadow
                >
                    <Card.Header
                        className="ai-help-modal-header"
                        title={
                            <Box
                                align="space-between"
                                width="100%"
                                verticalAlign="middle"
                            >
                                <Box
                                    gap="10px"
                                    verticalAlign="middle"
                                >
                                    <Box
                                        padding="4px"
                                        background="#5a48f5"
                                        borderRadius="8px"
                                    >
                                        <SparklesFilled
                                            fill="white"
                                        />
                                    </Box>

                                    <Text
                                        weight="bold"
                                        className="ai-help-modal-title"
                                    >
                                        My Tickets Support AI
                                    </Text>

                                    <Badge
                                        skin="neutralStandard"
                                        size="tiny"
                                    >
                                        Beta
                                    </Badge>
                                </Box>
                            </Box>
                        }
                        suffix={
                            <Box
                                gap="0px"
                                verticalAlign="middle"
                            >
                                <CopyClipboard value={conversationId}>
                                    {({ isCopied, copyToClipboard, reset }: any) => (
                                        <Tooltip appendTo="window" content="Copy conversation ID">
                                            <IconButton
                                                skin="ai"
                                                priority="tertiary"
                                                size="medium"
                                                onClick={() => (isCopied ? reset() : copyToClipboard())}
                                            >
                                                {isCopied ? <Check /> : <Copy />}
                                            </IconButton>
                                        </Tooltip>

                                    )}
                                </CopyClipboard>

                                <Tooltip appendTo="window" content="Start a new chat">
                                    <IconButton
                                        skin="ai"
                                        priority="tertiary"
                                        size="medium"
                                        onClick={() => {
                                            setUserInput('');
                                            setConversation([]);
                                            setConversationId(
                                                crypto.randomUUID(),
                                            );
                                            setGenerating(false);
                                            setGenerationStartedAt(
                                                null,
                                            );
                                            setGenerationStatus('');
                                        }}
                                    >
                                        <NewChat />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip appendTo="window" content="Close the chat">

                                    <IconButton
                                        skin="ai"
                                        priority="tertiary"
                                        onClick={onClose}
                                    >
                                        <X />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        }
                    />

                    <Card.Content
                        size="none"
                        dataHook="ai-help-modal-card-content"
                    >
                        <Box
                            height="100%"
                            minHeight="0px"
                            direction="vertical"
                            flexGrow={1}
                        >
                            <Box
                                paddingTop="20px"
                                width="100%"
                            >
                                <Divider direction="horizontal" />
                            </Box>

                            <MessageWrapper
                                agentName={agentName}
                                logoUrl={logoUrl}
                                conversation={conversation}
                                generating={generating}
                                generationStartedAt={
                                    generationStartedAt
                                }
                                generationStatus={
                                    generationStatus
                                }
                                onToolSubmit={
                                    handleToolSubmit
                                }
                                onFeedback={
                                    handleFeedback
                                }
                            />

                            <Box
                                padding="10px"
                                direction="vertical"
                                gap="8px"
                                flexShrink={0}
                            >
                                <Box
                                    gap="10px"
                                    boxSizing="border-box"
                                    width="100%"
                                    align="space-between"
                                >
                                    <Input
                                        size="medium"
                                        className="ai-help-modal-input"
                                        value={
                                            userInput
                                        }
                                        onChange={(
                                            e,
                                        ) =>
                                            setUserInput(
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(
                                            e,
                                        ) => {
                                            if (
                                                e.key ===
                                                'Enter'
                                            ) {
                                                handleSend();
                                            }
                                        }}
                                        disabled={
                                            generating
                                        }
                                    />

                                    <Box
                                        direction="vertical"
                                        height="100%"
                                        verticalAlign="bottom"
                                    >
                                        <Button
                                            size="medium"
                                            skin="ai"
                                            onClick={
                                                handleSend
                                            }
                                            disabled={
                                                generating ||
                                                !userInput.trim()
                                            }
                                        >
                                            Send
                                        </Button>
                                    </Box>
                                </Box>

                                <Box align="center">
                                    <Text
                                        size="tiny"
                                        className="ai-help-modal-warning"
                                    >
                                        AI can make mistakes.
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    </Card.Content>
                </Card>
            </Box>
        </Box>
    );
};
