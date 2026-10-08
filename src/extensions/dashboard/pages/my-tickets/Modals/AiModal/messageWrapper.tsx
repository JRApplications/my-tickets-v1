import {
    Box,
    IconButton,
    Text,
} from '@wix/design-system';
import { useEffect, useState } from 'react';
import {
    SparklesFilled,
    ThumbsDown,
    ThumbsUp,
    Copy,
    StatusComplete,
    ThumbsDownFilled,
    ThumbsUpFilled,
} from '@wix/wix-ui-icons-common/odeditor';
import MarkdownPreview from '@uiw/react-markdown-preview';
import {
    ToolForm,
    type ToolUI,
} from './toolForm';

interface ConversationMessage {
    message: string;
    userType: 'ai' | 'user';
    skill?: string | null;
    subSkill?: string | null;
    tool?: string | null;
    toolApprovalRequired?: boolean;
    toolArguments?: unknown;
    ui?: ToolUI | null;
    feedback?: 'helpful' | 'unhelpful' | null;
}

interface MessageWrapperProps {
    conversation: ConversationMessage[];
    generating: boolean;
    generationStartedAt: number | null;
    generationStatus: string;
    agentName: string;

    onToolSubmit: (
        messageIndex: number,
        tool: string,
        values: Record<string, string>,
    ) => void | Promise<void>;
    onFeedback: (
        messageIndex: number,
        feedback: 'helpful' | 'unhelpful' | null,
    ) => void | Promise<void>;
    logoUrl: string;
}

export const MessageWrapper = ({
    conversation,
    generating,
    generationStartedAt,
    generationStatus,
    agentName,
    onToolSubmit,
    onFeedback,
    logoUrl,
}: MessageWrapperProps) => {
    return (
        <Box
            boxSizing="border-box"
            direction="vertical"
            width="100%"
            gap="3px"
            padding="10px"
            minHeight={0}
            flexGrow={1}
            overflow="auto"
        >
            {conversation.length === 0 &&
                !generating && (
                    <Box direction="vertical" gap="7px" align="center" verticalAlign="middle" height="100%">
                        <div className="avatar-sparkle-wrap">
                            <img
                                style={{ borderRadius: '999px' }}
                                width={'50px'}
                                height={'50px'}
                                src={logoUrl}
                                alt="My Tickets Logo"
                                className="sidebar-ai-no-chat-image"
                            />
                            <div className="sparkle s1"></div>
                            <div className="sparkle s2"></div>
                            <div className="sparkle s3"></div>
                            <div className="sparkle s4"></div>
                        </div>

                        <Box direction="vertical" gap="0px" align="center">
                            <Text size="medium">
                                Hi <Text size="medium" weight="bold">{agentName}</Text>,
                            </Text>
                            <Text size="medium">How can I assist you today?</Text>
                        </Box>
                    </Box>
                )}

            {conversation.map(
                (msg, index) =>
                    msg.userType === 'ai' ? (
                        <AiMessage
                            key={index}
                            message={msg.message}
                            ui={msg.ui}
                            tool={msg.tool}
                            feedback={msg.feedback}
                            onToolSubmit={(
                                tool,
                                values,
                            ) =>
                                onToolSubmit(
                                    index,
                                    tool,
                                    values,
                                )
                            }
                            onFeedback={(
                                feedback,
                            ) =>
                                onFeedback(
                                    index,
                                    feedback,
                                )
                            }
                        />
                    ) : (
                        <UserMessage
                            key={index}
                            message={msg.message}
                        />
                    ),
            )}

            {generating && (
                <GeneratingMessage
                    generationStartedAt={generationStartedAt}
                    status={generationStatus}
                />
            )}
        </Box>
    );
};

interface GeneratingMessageProps {
    generationStartedAt: number | null;
    status: string;
}

const GeneratingMessage = ({
    generationStartedAt,
    status,
}: GeneratingMessageProps) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        if (!generationStartedAt) {
            setElapsedSeconds(0);
            return;
        }

        const updateElapsed = () => {
            setElapsedSeconds(
                Math.max(
                    0,
                    Math.floor(
                        (Date.now() - generationStartedAt) / 1000,
                    ),
                ),
            );
        };

        updateElapsed();
        const interval = window.setInterval(updateElapsed, 1000);

        return () => window.clearInterval(interval);
    }, [generationStartedAt]);

    return (
        <Box
            marginTop="6px"
            padding="8px"
            paddingLeft="0px"
            minWidth="50%"
            alignSelf="flex-start"
            borderRadius="8px"
            borderTopLeftRadius="0px"
            maxWidth="90%"
            role="status"
            aria-live="polite"
        >
            <Box gap="8px" direction="horizontal" verticalAlign="middle">
                <SparklesFilled
                    fill="#5a48f5"
                    className="generating-message-icon"
                />

                <Box direction="horizontal" gap={1} verticalAlign='middle'>
                    <Text className="generating-message">
                        {status}
                    </Text>
                    <Text size="tiny" className="generating-message-time" secondary>
                        {elapsedSeconds} {elapsedSeconds === 1 ? 's' : 's'}
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

interface AiMessageProps {
    message: string;
    ui?: ToolUI | null;
    tool?: string | null;
    feedback?: 'helpful' | 'unhelpful' | null;

    onToolSubmit: (
        tool: string,
        values: Record<string, string>,
    ) => void | Promise<void>;
    onFeedback: (
        feedback: 'helpful' | 'unhelpful' | null,
    ) => void | Promise<void>;
}

const AiMessage = ({
    message,
    ui,
    tool,
    feedback,
    onToolSubmit,
    onFeedback,
}: AiMessageProps) => {
    const [copied, setCopied] = useState(false);

    const hasLiked = feedback === 'helpful';
    const hasDisliked = feedback === 'unhelpful';

    const handleDislike = () => {
        onFeedback(hasDisliked ? null : 'unhelpful');
    };

    const handleLike = () => {
        onFeedback(hasLiked ? null : 'helpful');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (message === 'Precondition Failed') message = 'You do not have enough AI credits. Please topup your account.';

    return (
        <Box
            direction="vertical"
            gap="6px"
        >
            <Text size="tiny" weight='bold'>
                AI Assistant
            </Text>

            <Box
                padding="8px"
                borderRadius="8px"
                minWidth="50%"
                alignSelf="flex-start"
                className="ai-message"
                maxWidth="70%"
                width={
                    ui
                        ? '100%'
                        : undefined
                }
            >
                <MarkdownPreview
                    source={message}
                    style={{
                        padding: 0,
                        background:
                            'transparent',
                        color: 'inherit',
                    }}
                />
            </Box>

            {ui && tool && (
                <Box
                    padding="8px"
                    borderRadius="8px"
                    border="1px solid #dddbdb"
                    width="100%"
                    boxSizing="border-box"
                >
                    <ToolForm
                        ui={ui}
                        onSubmit={(
                            values,
                        ) =>
                            onToolSubmit(
                                tool,
                                values,
                            )
                        }
                    />
                </Box>
            )}
            <Box width='100%' align='left'>
                <IconButton size='tiny' skin="ai" priority="tertiary" onClick={handleCopy}>{copied ? <StatusComplete /> : <Copy />}</IconButton>
                <IconButton size='tiny' skin="ai" priority="tertiary" onClick={handleDislike}>{hasDisliked ? <ThumbsDownFilled /> : <ThumbsDown />}</IconButton>
                <IconButton size='tiny' skin="ai" priority="tertiary" onClick={handleLike}>{hasLiked ? <ThumbsUpFilled /> : <ThumbsUp />}</IconButton>
            </Box>
        </Box>
    );
};

const UserMessage = ({
    message,
}: {
    message: string;
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Box
            direction="vertical"
            gap="4px"
        >
            <Box alignSelf="flex-end">
                <Text size="tiny">
                    Me
                </Text>
            </Box>

            <Box
                minWidth="50%"
                alignSelf="flex-end"
                borderRadius="8px"
                padding="8px"
                backgroundColor="#EEECFB"
                maxWidth="70%"
            >
                <MarkdownPreview
                    source={message}
                    style={{
                        padding: 0,
                        background:
                            'transparent',
                    }}
                />
            </Box>
            <Box width='100%' align='right'>
                <IconButton size='tiny' skin="ai" priority="tertiary" onClick={handleCopy}>{copied ? <StatusComplete /> : <Copy />}</IconButton>
            </Box>
        </Box>
    );
};