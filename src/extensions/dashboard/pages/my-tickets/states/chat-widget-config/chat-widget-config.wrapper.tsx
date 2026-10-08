import type { BusinessSupportHoursItem } from './chat-widget-config.types';
import {
    Box,
    Button,
    Text,
    TextButton,
    Loader,
    ToggleSwitch,
    Checkbox,
    Dropdown,
    FormField,
    Input,
    TagList,
    Card,
    IconButton,
    TimeInput,
    Table,
    SectionHelper,
    Page,
    SkeletonLine,
    SkeletonRectangle,
} from '@wix/design-system';
import { ChevronDown, ChevronUp, InfoCircle } from '@wix/wix-ui-icons-common';
import { useEffect, useMemo, useState } from 'react';
import { fetchTeams as fetchTeamsApi } from './chat-widget-config';
import type { TeamOption, Config, ChatWidgetConfigWrapperProps } from './chat-widget-config.types';
import { PermissionDeniedState, LoadingState } from '@jrapps/my_tickets_dashboard_ui';
import './chat-widget-config.css';

const defaultBusinessSupportHours: BusinessSupportHoursItem[] = [
    { day: 'Monday', closed: false, startTime: null, endTime: null },
    { day: 'Tuesday', closed: false, startTime: null, endTime: null },
    { day: 'Wednesday', closed: false, startTime: null, endTime: null },
    { day: 'Thursday', closed: false, startTime: null, endTime: null },
    { day: 'Friday', closed: false, startTime: null, endTime: null },
    { day: 'Saturday', closed: false, startTime: null, endTime: null },
    { day: 'Sunday', closed: false, startTime: null, endTime: null },
];

const ChatWidgetConfigWrapper = ({ onSave, isSaving, config, isLoading, permissions }: ChatWidgetConfigWrapperProps) => {

    const [teams, setTeams] = useState<TeamOption[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);
    const [generalTeamId, setGeneralTeamId] = useState(config?.generalTeamId || '');
    const [isChatQuestionsEnabled, setIsChatQuestionsEnabled] = useState(config?.enableChatQuestions || false);
    const [businessSupportHours, setBusinessSupportHours] = useState<BusinessSupportHoursItem[]>(
        config?.businessSupportHours?.length ? config.businessSupportHours : defaultBusinessSupportHours
    );
    const [isBusinessSupportHoursStateOpen, setIsBusinessSupportHoursStateOpen] = useState(false);
    const [questionDraft, setQuestionDraft] = useState('');
    const [questions, setQuestions] = useState<string[]>(config?.chatQuestions || []);
    const [isAiEnabled, setIsAiEnabled] = useState(config?.useAiDirect || false);
    const [selectedAiTeamIds, setSelectedAiTeamIds] = useState<string[]>([]);
    const [tagDraftByTeamId, setTagDraftByTeamId] = useState<Record<string, string>>({});
    const [tagsByTeamId, setTagsByTeamId] = useState<Record<string, string[]>>({});
    const [isError, setIsError] = useState(false);

    // Sync state when config prop changes
    useEffect(() => {
        if (config) {
            setGeneralTeamId(config.generalTeamId || '');
            setIsChatQuestionsEnabled(config.enableChatQuestions || false);
            setQuestions(config.chatQuestions || []);
            setIsAiEnabled(config.useAiDirect || false);
            setBusinessSupportHours(
                config.businessSupportHours?.length ? config.businessSupportHours : defaultBusinessSupportHours
            );
            setSelectedAiTeamIds(config.availableTeams?.map(team => team._id) || []);
            const keywordsByTeamId: Record<string, string[]> = {};
            config.availableTeams?.forEach(team => {
                keywordsByTeamId[team._id] = team.keywords || [];
            });
            setTagsByTeamId(keywordsByTeamId);
        }
    }, [config]);

    useEffect(() => {
        const loadTeams = async () => {
            setIsLoadingTeams(true);
            setIsError(false);
            try {
                const fetchedTeams = await fetchTeamsApi();
                setTeams(fetchedTeams);
            } catch (error: any) {
                console.error(error.message);
                setIsError(true);
            } finally {
                setIsLoadingTeams(false);
            }
        };
        loadTeams();
    }, []);

    const teamOptions = useMemo(
        () => teams.map((team) => ({ id: team._id, value: team.name })),
        [teams]
    );

    const selectedAiTeams = useMemo(
        () => teams.filter((team) => selectedAiTeamIds.includes(team._id)),
        [teams, selectedAiTeamIds]
    );

    const addQuestion = () => {
        const nextQuestion = questionDraft.trim();
        if (!nextQuestion) {
            return;
        }

        setQuestions((prev) => [...prev, nextQuestion]);
        setQuestionDraft('');
    };

    const removeQuestion = (questionIndex: number) => {
        setQuestions((prev) => prev.filter((_, index) => index !== questionIndex));
    };

    const toggleAiTeamSelection = (teamId: string) => {
        setSelectedAiTeamIds((prev) => {
            if (prev.includes(teamId)) {
                return prev.filter((id) => id !== teamId);
            }

            return [...prev, teamId];
        });
    };

    const setTagDraft = (teamId: string, value: string) => {
        setTagDraftByTeamId((prev) => ({
            ...prev,
            [teamId]: value,
        }));
    };

    const addTeamTag = (teamId: string) => {
        const nextTag = (tagDraftByTeamId[teamId] || '').trim();
        if (!nextTag) {
            return;
        }

        setTagsByTeamId((prev) => {
            const existingTags = prev[teamId] || [];
            const isDuplicate = existingTags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase());
            if (isDuplicate) {
                return prev;
            }

            return {
                ...prev,
                [teamId]: [...existingTags, nextTag],
            };
        });

        setTagDraft(teamId, '');
    };

    const removeTeamTag = (teamId: string, tagToRemove: string) => {
        setTagsByTeamId((prev) => ({
            ...prev,
            [teamId]: (prev[teamId] || []).filter((tag) => tag !== tagToRemove),
        }));
    };

    const handleSave = () => {
        const configToSave: Config = {
            chatQuestions: questions,
            enableChatQuestions: isChatQuestionsEnabled,
            useAiDirect: isAiEnabled,
            businessSupportHours: businessSupportHours as BusinessSupportHoursItem[],
            availableTeams: teams.filter((team) => selectedAiTeamIds.includes(team._id)).map((team) => ({
                ...team,
                keywords: tagsByTeamId[team._id] || [],
            })),
            generalTeamId,
        };
        onSave(configToSave);
    }

    const handleChatQuestionsEnableChange = () => {
        setIsChatQuestionsEnabled((prev) => !prev);
    }

    const handleAiEnableChange = () => {
        setIsAiEnabled((prev) => !prev);
    };

    const handleBusinessSupportHoursToggle = () => {
        setIsBusinessSupportHoursStateOpen((prev) => !prev);
    };

    if (!permissions.includes('my-tickets-manage-chat-widget-settings')) {
        return (<PermissionDeniedState />);
    }

    if (isError) {
        return (
            <LoadingState
                state={'error'}
                errorText='Failed to load chat widget configuration. Please try again later.'
            />
        );
    }

    const handleBusinessSupportHoursChange = (day: string, field: 'closed' | 'startTime' | 'endTime', value: boolean | Date | null | any) => {
        setBusinessSupportHours((prev) =>
            prev.map((item) =>
                item.day === day ? { ...item, [field]: field === 'startTime' || field === 'endTime' ? value.date : value } : item
            )
        );
    };

    const businessHourColumns = [
        {
            title: 'Day',
            render: (row: any) => <Text>{row.day}</Text>,
        },
        {
            title: 'Closed',
            render: (row: any) => <ToggleSwitch checked={row.closed} onChange={() => handleBusinessSupportHoursChange(row.day, 'closed', !row.closed)} />,
        },
        {
            title: 'Start Time',
            render: (row: any) => <TimeInput step={5} value={row.startTime} onChange={(value) => handleBusinessSupportHoursChange(row.day, 'startTime', value as any)} />,
        },
        {
            title: 'End Time',
            render: (row: any) => <TimeInput step={5} value={row.endTime} onChange={(value) => handleBusinessSupportHoursChange(row.day, 'endTime', value as any)} />,
        },
    ]

    return (
        <Page maxWidth={9999} className="chat-widget-config-page">
            <Page.Header
                title="Chat Widget Configuration"
                actionsBar={isLoading ? <SkeletonRectangle width='120px' height='35px' /> : <Button size='medium' onClick={handleSave}>{isSaving ? <Loader size='tiny' /> : 'Save'}</Button>} />
            <Page.Content>
                <Box direction="vertical" width='100%'>
                    <Box direction='vertical' gap={4}>
                        <Card showShadow>
                            <Card.Header
                                title={isLoading ? <SkeletonLine width='200px' /> : 'General point of contact team'}
                                subtitle={isLoading ? <SkeletonLine width='400px' /> : "This is where you select the team that will handle all incoming chats. If you use AI to direct chats, this team will be the fallback for any chats that cannot be automatically routed."} />
                            <Card.Content>
                                {isLoading || isLoadingTeams ? <SkeletonRectangle width='100%' height='35px' /> : (
                                    <Dropdown
                                        options={teamOptions}
                                        selectedId={generalTeamId}
                                        onSelect={(option) => setGeneralTeamId(String(option.id))}
                                        placeholder={isLoadingTeams ? 'Loading teams...' : 'Select a team'}
                                        disabled={isLoadingTeams}
                                    />
                                )}
                            </Card.Content>
                        </Card>

                        <Card showShadow>
                            <Card.Header
                                title={isLoading ? <SkeletonLine width='200px' /> : 'Initial chat questions'}
                                subtitle={isLoading ? <SkeletonLine width='400px' /> : "This option allows you to enable or disable initial chat questions for users to answer before chat transfer or AI routing to the appropriate team."}
                                suffix={isLoading ? <SkeletonRectangle width='60px' height='30px' /> : <ToggleSwitch checked={isChatQuestionsEnabled} onChange={handleChatQuestionsEnableChange} />} />
                            {isChatQuestionsEnabled && !isLoading && (
                                <>
                                    <Card.Content>
                                        <Box direction='vertical' gap={3}>
                                            <Box direction='horizontal' gap={2} verticalAlign='bottom'>
                                                <Box width='100%'>
                                                    <FormField label='Add question'>
                                                        <Input
                                                            value={questionDraft}
                                                            onChange={(event) => setQuestionDraft(event.currentTarget.value)}
                                                            placeholder='Example: What can we help you with today?'
                                                            onKeyDown={(event) => event.key === 'Enter' && addQuestion()}
                                                            size='medium'
                                                        />
                                                    </FormField>
                                                </Box>
                                                <Button size='medium' onClick={addQuestion}>Add</Button>
                                            </Box>

                                            {questions.length > 0 && (
                                                <Box direction='vertical' gap={2}>
                                                    {questions.map((question, index) => (
                                                        <Box
                                                            key={`${question}-${index}`}
                                                            direction='horizontal'
                                                            align='space-between'
                                                            verticalAlign='middle'
                                                            border='1px solid #DFE5EB'
                                                            borderRadius='6px'
                                                            padding='8px 12px'
                                                        >
                                                            <Text size='small'>{question}</Text>
                                                            <TextButton
                                                                size='small'
                                                                onClick={() => removeQuestion(index)}
                                                            >
                                                                Remove
                                                            </TextButton>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>
                                    </Card.Content>
                                </>
                            )}
                        </Card>

                        <Card showShadow>
                            <Card.Header
                                title={isLoading ? <SkeletonLine width='200px' /> : 'AI routing'}
                                subtitle={isLoading ? <SkeletonLine width='400px' /> : "This option allows you to enable or disable AI routing to transfer incoming chats to the correct team."}
                                suffix={isLoading ? <SkeletonRectangle width='60px' height='30px' /> : <ToggleSwitch checked={isAiEnabled} onChange={handleAiEnableChange} />} />
                            {isAiEnabled && !isLoading && (
                                <>
                                    <Card.Content>
                                        <Box direction='vertical' gap={3}>
                                            {isLoadingTeams ? (
                                                <Loader status='loading' size='small' text='Loading teams...' />
                                            ) : (
                                                <Box className='chat-widget-config-ai-team-list' width='100%'>
                                                    {teams.map((team) => {
                                                        const isSelected = selectedAiTeamIds.includes(team._id);
                                                        return (
                                                            <Checkbox
                                                                key={team._id}
                                                                className='chat-widget-config-ai-team-checkbox'
                                                                checked={isSelected}
                                                                onChange={() => toggleAiTeamSelection(team._id)}
                                                            >
                                                                {team.name}
                                                            </Checkbox>
                                                        );
                                                    })}
                                                </Box>
                                            )}

                                            {selectedAiTeams.length > 0 && (
                                                <Box direction='vertical' gap={3}>
                                                    {selectedAiTeams.map((team) => (
                                                        <Box
                                                            key={team._id}
                                                            direction='vertical'
                                                            gap={2}
                                                            border='1px solid #DFE5EB'
                                                            borderRadius='8px'
                                                            padding='12px'
                                                        >
                                                            <Text size='small' weight='normal'>Tags for {team.name}</Text>
                                                            <Box direction='horizontal' gap={2} verticalAlign='bottom'>
                                                                <Box width='100%'>
                                                                    <FormField label='Add team tag'>
                                                                        <Input
                                                                            value={tagDraftByTeamId[team._id] || ''}
                                                                            onChange={(event) => setTagDraft(team._id, event.currentTarget.value)}
                                                                            placeholder='Example: billing, urgent, onboarding'
                                                                            onKeyDown={(event) => {
                                                                                if (event.key === 'Enter') {
                                                                                    addTeamTag(team._id);
                                                                                }
                                                                            }}
                                                                        />
                                                                    </FormField>
                                                                </Box>
                                                                <Button size='small' onClick={() => addTeamTag(team._id)}>Add Tag</Button>
                                                            </Box>

                                                            <TagList
                                                                size='small'
                                                                tags={(tagsByTeamId[team._id] || []).map((tag) => ({
                                                                    id: tag,
                                                                    children: tag,
                                                                }))}
                                                                onTagRemove={(tagId) => removeTeamTag(team._id, tagId)}
                                                                maxVisibleTags={5}
                                                                actionButton={{ label: 'Clear All', onClick: tagsByTeamId[team._id] ? () => setTagsByTeamId((prev) => ({ ...prev, [team._id]: [] })) : undefined }}
                                                                toggleMoreButton={(amountOfHiddenTags, isExpanded) => ({
                                                                    label: isExpanded ? 'Show Less' : `+${amountOfHiddenTags} More`,
                                                                    tooltipContent: !isExpanded && 'Show more tags',
                                                                })}
                                                            />
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>
                                    </Card.Content>
                                </>
                            )}
                        </Card>

                        <Card showShadow>
                            <Card.Header
                                title={isLoading ? <SkeletonLine width='200px' /> : "Business Support Hours"}
                                subtitle={isLoading ? <SkeletonLine width='400px' /> : "Set the days and times your business is available to provide support. Toggle a day as closed if your business is not available."}
                                suffix={isLoading ? null : <IconButton skin="dark" priority="tertiary" onClick={handleBusinessSupportHoursToggle}>{isBusinessSupportHoursStateOpen ? <ChevronUp /> : <ChevronDown />}</IconButton>} />
                            {isBusinessSupportHoursStateOpen && !isLoading && (
                                <>
                                    <Card.Content>
                                        <Box direction='vertical' gap={3}>
                                            <Table
                                                skin="neutral"
                                                data={businessSupportHours}
                                                columns={businessHourColumns}
                                                rowVerticalPadding="medium"
                                            >
                                                <Table.Content />
                                            </Table>
                                            <SectionHelper size="medium" showPrefixIcon prefixIcon={<InfoCircle />} skin="standard"><Text>Customers will only be able to start a chat during your business hours.</Text></SectionHelper>
                                        </Box>
                                    </Card.Content>
                                </>
                            )}
                        </Card>
                    </Box>
                </Box>
            </Page.Content>
        </Page>
    );
};

export default ChatWidgetConfigWrapper;