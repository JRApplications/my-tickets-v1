import { WixDesignSystemProvider, Box } from '@wix/design-system';
import { ExtensionIds, StateId } from '@jrapps/my_tickets_common_types';
import { StateContainerProvider } from './StateContainerProvider';
import { StateProvider } from './StateProvider';
import type { FC } from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import '@wix/design-system/styles.global.css';
import '@wix/design-system/themes/odeditor.global.css';
import './my-page.css';
import { SidebarProvider } from './SidebarProvider/SidebarProvider';
import { StateOverrideProvider } from './StateOverrideProvider';
import { dashboard } from '@wix/dashboard';
import { ModalsProvider } from './Modals';
import { LoginPage } from './login';
import { DevTestOverrideProvider } from './DevTestOverrideProvider';
import { clearMyTicketsAgentSession, myTicketsFetchWithAuth } from './auth/myTicketsFetchWithAuth';
import { subscriber } from '@wix/realtime';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import NotificationProvider from './NotificationProvider';
import type { LoginSuccessData } from './login';
import { getAgentActivitySessionId } from './SidebarProvider/useTeamPresence';
import { checkNeedsOnboarding, MainAdminOnboardingModal } from './Modals/MainAdminOnboardingModal';

const DashboardPage: FC = () => {
  const [state, setState] = useState<StateId>(StateId.Home);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState<boolean>(false);
  const [createTicketFromChat, setCreateTicketFromChat] = useState<{ memberId: string; conversationId: string } | null>(null);
  const [loggedInAgent, setLoggedInAgent] = useState<{
    agentId: string;
    teamId: string;
    roleId: string;
    name: string;
    teamName: string;
    roleName: string;
    permissions: string[];
    agentProfilePictureUrl: string;
  }>({
    agentId: "",
    teamId: "",
    roleId: "",
    name: "",
    teamName: "",
    roleName: "",
    permissions: [],
    agentProfilePictureUrl: ""
  });
  const [teamStateProps, setTeamStateProps] = useState<any>({
    isTeamModalOpen: false,
    state: 'create',
    teamId: "",
  });
  const [agentStateProps, setAgentStateProps] = useState<any>({
    isAgentModalOpen: false,
    state: 'create',
    agentId: "",
  });
  const [ticketStateProps, setTicketStateProps] = useState<any>({
    ticketId: "",
  });
  const [ticketAssignmentUpdate, setTicketAssignmentUpdate] = useState<{
    ticketId: string;
    assignedAgent?: { id?: string; name?: string };
    assignedTeam?: { id?: string; name?: string };
  } | null>(null);
  const [visibleTicketIds, setVisibleTicketIds] = useState<string[]>([]);
  const [viewChatStateProps, setViewChatStateProps] = useState<any>({
    conversationId: '',
  });
  const [isAiHelpModalOpen, setIsAiHelpModalOpen] = useState<boolean>(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState<boolean>(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [isTransferTicketModalOpen, setIsTransferTicketModalOpen] = useState<boolean>(false);
  const [modalTicketId, setModalTicketId] = useState<string>("");
  const [isViewMemberModalOpen, setIsViewMemberModalOpen] = useState<boolean>(false);
  const [modalMemberId, setModalMemberId] = useState<string>("");
  const [isAssignTicketConfirmModalOpen, setIsAssignTicketConfirmModalOpen] = useState<boolean>(false);
  const [assignTicketConfirmModalAssignType, setAssignTicketConfirmModalAssignType] = useState<'assign' | 'unassign'>('assign');
  const [isMergeTicketModalOpen, setIsMergeTicketModalOpen] = useState<boolean>(false);
  const [mergeTicketPrimaryId, setMergeTicketPrimaryId] = useState<string>("");
  const [updatedPriority, setUpdatedPriority] = useState<string | null>(null);
  const [updatedStatus, setUpdatedStatus] = useState<string | null>(null);
  const [viewTicketStateOverride, setViewTicketStateOverride] = useState<boolean>(false);
  const [viewTicketOverrideTicketId, setViewTicketOverrideTicketId] = useState<string | null>(null);
  const [notificationStateProps, setNotificationStateProps] = useState<any>({
    onNotificationRemove: undefined,
    notifications: [],
    isLoading: false,
    isError: false,
  });
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userBetaFeatures, setUserBetaFeatures] = useState<string[]>([]);
  const subscriptionRef = useRef<string | null>(null);
  const updateTicketFnRef = useRef<((ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => void) | null>(null);
  const currentUrl = new URL(import.meta.url);
  const logoUrl = currentUrl.origin + '/logo.png';

  useEffect(() => {
    // Remove profiles written by older builds; only the token and expiry are persisted now.
    sessionStorage.removeItem('my-tickets-agent-profile');
    // Older builds stored non-remembered sessions in sessionStorage. They are
    // intentionally not restored after a reload.
    sessionStorage.removeItem('my-tickets-auth-token');
    sessionStorage.removeItem('my-tickets-auth-token-expires-at');

    const handleAuthExpired = () => {
      setLoggedInAgent({
        agentId: '', teamId: '', roleId: '', name: '', teamName: '', roleName: '',
        permissions: [], agentProfilePictureUrl: '',
      });
    };
    window.addEventListener('my-tickets-auth-expired', handleAuthExpired);

    const restoreAgentSession = async () => {
      if (!localStorage.getItem('my-tickets-auth-token')) return;
      try {
        const response = await myTicketsFetchWithAuth(`${currentUrl.origin}/api/agents/logged-in-agent`);
        const result = await response.json();
        if (!response.ok || !result.success || !result.user) {
          throw new Error(result.error || 'Could not restore agent session');
        }
        setLoggedInAgent({
          agentId: result.user._id,
          teamId: result.user.teamId,
          roleId: result.user.roleId,
          name: result.user.name,
          teamName: result.user.teamName,
          roleName: result.user.roleName,
          permissions: result.user.permissions,
          agentProfilePictureUrl: result.user.agentProfilePictureUrl,
        });
      } catch (error) {
        console.error('Failed to restore My Tickets agent session', error);
        clearMyTicketsAgentSession();
        handleAuthExpired();
      }
    };
    void restoreAgentSession();

    return () => window.removeEventListener('my-tickets-auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    let isMounted = true;
    void checkNeedsOnboarding()
      .then((needsSetup) => { if (isMounted) setNeedsOnboarding(needsSetup); })
      .catch((error) => console.error('Failed to check initial My Tickets setup', error));
    return () => { isMounted = false; };
  }, []);

  const handleStateOverride = (stateId: string) => {
    setViewTicketStateOverride(stateId === StateId.ViewTickets);
    if (stateId === StateId.ViewTickets) {
      setTicketStateProps((prev: any) => ({ ...prev, ticketId: viewTicketOverrideTicketId }));
    }
    setState(stateId as StateId);
  };

  const handleStateOverrideStart = async (stateId: string) => {
    const pageUrl = await dashboard.getPageUrl({
      pageId: ExtensionIds.DASHBOARD_PAGE,
      relativeUrl: `?stateOverride=${stateId}`,
    });
    // open the page url in a new tab
    window.open(pageUrl, '_blank');
  };

  const handleTicketClick = (ticketId: string) => {
    setState(StateId.ViewTickets);
    setTicketStateProps((prev: any) => ({ ...prev, ticketId }));
  };

  const handleTicketTabChange = (ticketId: string | null) => {
    setTicketStateProps((prev: any) => ({ ...prev, ticketId: ticketId ?? '' }));
  };

  const handleVisibleTicketsChange = useCallback((ticketIds: string[]) => {
    setVisibleTicketIds((previous) =>
      previous.length === ticketIds.length && previous.every((id, index) => id === ticketIds[index])
        ? previous
        : ticketIds
    );
  }, []);

  const navigateTicket = (direction: -1 | 1) => {
    const currentIndex = visibleTicketIds.indexOf(ticketStateProps.ticketId);
    const nextTicketId = visibleTicketIds[currentIndex + direction];
    if (currentIndex >= 0 && nextTicketId) {
      handleTicketClick(nextTicketId);
    }
  };

  const handleAssignAgent = async (ticketId: string, agentId: string, type: 'assign' | 'unassign') => {
    try {
      const baseApiUrl = new URL(import.meta.url).origin;
      if (type === 'unassign') {
        const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/unassignAgent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ticketId, agentId })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Failed to unassign agent from ticket');
        const updates = { assignedAgent: result.assignedAgent, assignedTeam: result.assignedTeam };
        handleTicketUpdate(ticketId, updates);
        setTicketAssignmentUpdate({ ticketId, ...updates });
      } else if (type === 'assign') {
        const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/assignAgent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ticketId, agentId })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Failed to assign agent to ticket');
        const updates = { assignedAgent: result.assignedAgent, assignedTeam: result.assignedTeam };
        handleTicketUpdate(ticketId, updates);
        setTicketAssignmentUpdate({ ticketId, ...updates });
      }
    } catch (error) {
      console.error('Failed to assign agent to ticket', error);
    }
  };

  const handleNotificationRemove = async (id: string) => {
    await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/notifications/removeNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationId: id, agentId: loggedInAgent.agentId })
    });

    setNotificationStateProps((prev: any) => ({
      ...prev,
      notifications: prev.notifications?.filter((notification: any) => notification.id !== id)
    }));
  };

  const handleTicketUpdate = (ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => {
    if (updateTicketFnRef.current) {
      updateTicketFnRef.current(ticketId, updates);
    }
  };

  useEffect(() => {
    // Guard: only set up subscription if agentId is available and not already subscribed
    if (!loggedInAgent.agentId || subscriptionRef.current === loggedInAgent.agentId) return;

    subscriptionRef.current = loggedInAgent.agentId;

    let abortController: AbortController | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isFetching = false;

    const fetchAgentNotifications = async () => {
      // Prevent overlapping requests (e.g. from bursts of realtime messages/retries)
      if (isFetching) return;
      isFetching = true;
      abortController?.abort();
      abortController = new AbortController();

      setNotificationStateProps((prev: any) => ({
        ...prev,
        isLoading: true,
        isError: false
      }));
      try {
        const baseApiUrl = new URL(import.meta.url).origin;
        const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/notifications/getNotifications?id=${loggedInAgent.agentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: abortController.signal
        });
        const result = await response.json();
        setNotificationStateProps((prev: any) => ({
          ...prev,
          notifications: result.notifications,
          isLoading: false,
          isError: false
        }));
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Failed to fetch agent notifications', error);
        setNotificationStateProps((prev: any) => ({
          ...prev,
          isLoading: false,
          isError: true
        }));
      } finally {
        isFetching = false;
      }
    };

    // Collapse bursts of triggers (repeated messages/retries) into a single fetch
    const scheduleFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAgentNotifications, 500);
    };

    const channel1 = { name: 'AGENT_NOTIFICATIONS', resourceId: loggedInAgent.agentId };
    subscriber.subscribe(
      channel1,
      async (message, channel) => {
        const channelName = channel.name;
        const channelResourceId = channel.resourceId;
        if (channelName === 'AGENT_NOTIFICATIONS' && channelResourceId === loggedInAgent.agentId) {
          scheduleFetch();
        }
      },
      {
        onSubscribed: () => console.log('Agent Notifications Subscribed'),
        onSubscriptionError: (error) => { console.error('Error', error); ShowToast({ message: 'Failed to subscribe to internal agent mail messages. Please try again.', type: 'error' }); },
      }
    );

    fetchAgentNotifications();
    fetchBetaUserStatus();

    return () => {
      subscriber.unsubscribe({ channel: channel1 });
      subscriptionRef.current = null;
      abortController?.abort();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [loggedInAgent.agentId]);

  // SLA breach detection runs on demand: any open dashboard with ticket access nudges the server on a timer.
  const canRunSlaSweep = loggedInAgent.permissions.includes('my-tickets-view-all-tickets');
  useEffect(() => {
    if (!loggedInAgent.agentId || !canRunSlaSweep) return;
    const baseApiUrl = new URL(import.meta.url).origin;
    const runSweep = () => {
      myTicketsFetchWithAuth(`${baseApiUrl}/api/sla/sweep`, { method: 'POST' }).catch(() => undefined);
    };
    runSweep();
    const interval = setInterval(runSweep, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loggedInAgent.agentId, canRunSlaSweep]);

  const handleChatClick = (chatId: string) => {
    setViewChatStateProps((prev: any) => ({
      ...prev,
      conversationId: chatId
    }));
  };

  const fetchBetaUserStatus = async () => {
    try {
      const baseApiUrl = new URL(import.meta.url).origin;
      const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/using-my-tickets/isBetaUser`);
      const data = await response.json();
      setUserBetaFeatures(data?.betaFeatures ?? []);
    } catch (error) {
      console.error('Failed to fetch beta user status', error);
    }
  };

  const handleLoginSuccess = (data: LoginSuccessData) => {
    setLoggedInAgent({
      agentId: data.agentId,
      teamId: data.teamId,
      roleId: data.roleId,
      name: data.name,
      teamName: data.teamName,
      roleName: data.roleName,
      permissions: data.permissions,
      agentProfilePictureUrl: data.agentProfilePictureUrl,
    });
  };

  const handleLogout = async () => {
    if (loggedInAgent.agentId) {
      try {
        await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/agents/activity-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'offline', sessionId: getAgentActivitySessionId() }),
        });
      } catch (error) {
        console.error('Failed to publish offline status', error);
      }
    }
    clearMyTicketsAgentSession();
    setState(StateId.Home);
  };

  if (!loggedInAgent.agentId) {
    return (
      <WixDesignSystemProvider>
        <LoginPage handleLoginSuccess={handleLoginSuccess} isGettingReady={false} />
        <MainAdminOnboardingModal
          isOpen={needsOnboarding}
          onComplete={(user) => {
            setNeedsOnboarding(false);
            handleLoginSuccess(user);
          }}
        />
      </WixDesignSystemProvider>
    );
  }

  return (
    <WixDesignSystemProvider>
      <StateOverrideProvider onStateOverride={handleStateOverride} viewTicketOverrideTicketId={setViewTicketOverrideTicketId}>
        <DevTestOverrideProvider agentIdOverride={setLoggedInAgent} loggedInAgent={loggedInAgent}>
          <div className='app'>
            <NotificationProvider notificationMessage={'Test'} isShown={false} />
            <Box width='100%' height='100%'>
              <SidebarProvider
                stateId={state}
                onLogout={handleLogout}
                onItemClick={(stateId) => { setState(stateId as StateId); }}
                onCreateTicketClicked={() => { setIsCreateTicketModalOpen(true); }}
                onInternalMailClicked={() => { handleStateOverrideStart(StateId.InternalChat); }}
                permissions={loggedInAgent.permissions}
                agentId={loggedInAgent.agentId}
                agentName={loggedInAgent.name}
                agentRole={loggedInAgent.roleName}
                agentProfilePictureUrl={loggedInAgent.agentProfilePictureUrl}
                teamId={loggedInAgent.teamId}
                onTicketClick={handleTicketClick}
                onVisibleTicketsChange={handleVisibleTicketsChange}
                onGetTicketUpdateFn={(updateFn) => { updateTicketFnRef.current = updateFn; }}
                onAiButtonClicked={() => { setIsAiHelpModalOpen(true); }}
                notificationProps={{
                  onNotificationRemove: handleNotificationRemove,
                  notifications: notificationStateProps.notifications,
                  isLoading: notificationStateProps.isLoading,
                  isError: notificationStateProps.isError
                }}
                viewTicketStateOverride={viewTicketStateOverride}
                onChatClick={handleChatClick}
                userBetaFeatures={userBetaFeatures}
                sidebarIsLoading={false}
              />
              <StateContainerProvider>
                <StateProvider
                  onCreateTicket={() => setIsCreateTicketModalOpen(true)}
                  onNavigate={(stateId) => setState(stateId)}
                  onTicketClick={handleTicketClick}
                  teamId={loggedInAgent.teamId}
                  agentId={loggedInAgent.agentId}
                  stateId={state}
                  permissions={loggedInAgent.permissions}
                  agentProps={{
                    onModalOpen: (modalState, agentId) => {
                      setAgentStateProps((prev: any) => ({
                        ...prev, isAgentModalOpen: true, state: modalState, agentId: agentId || ""
                      }));
                    }
                  }}
                  teamProps={{
                    onModalOpen: (modalState, teamId) => {
                      setTeamStateProps((prev: any) => ({
                        ...prev, isTeamModalOpen: true, state: modalState, teamId: teamId || ""
                      }));
                    }
                  }}
                  ticketStateProps={{
                    ticketId: viewTicketStateOverride ? viewTicketOverrideTicketId : ticketStateProps.ticketId,
                    onTicketDispositionChange: (ticketId: string, updates: { isSpam: boolean; isDeleted: boolean }) => handleTicketUpdate(ticketId, updates),
                    assignmentUpdate: ticketAssignmentUpdate,
                    onTicketTabChange: handleTicketTabChange,
                    onPreviousTicket: visibleTicketIds.indexOf(ticketStateProps.ticketId) > 0
                      ? () => navigateTicket(-1)
                      : undefined,
                    onNextTicket: visibleTicketIds.indexOf(ticketStateProps.ticketId) >= 0 &&
                      visibleTicketIds.indexOf(ticketStateProps.ticketId) < visibleTicketIds.length - 1
                      ? () => navigateTicket(1)
                      : undefined,

                    onTicketStatusChangeButtonClicked: (ticketId: string) => {
                      setModalTicketId(ticketId);
                      setIsStatusModalOpen(true);
                    },
                    onChangePriorityButtonClicked: (ticketId: string) => {
                      setModalTicketId(ticketId);
                      setIsPriorityModalOpen(true);
                    },
                    onTransferTicketButtonClicked: (ticketId: string) => {
                      setModalTicketId(ticketId);
                      setIsTransferTicketModalOpen(true);
                    },
                    onViewMemberClicked: (memberId: string) => {
                      setModalMemberId(memberId);
                      setIsViewMemberModalOpen(true);
                    },
                    onAssignToMeClicked: ({ type }) => {
                      setModalTicketId(ticketStateProps.ticketId);
                      setIsAssignTicketConfirmModalOpen(true);
                      setAssignTicketConfirmModalAssignType(type);
                    },
                    onMergeTicketClicked: (ticketId: string) => {
                      setMergeTicketPrimaryId(ticketId);
                      setIsMergeTicketModalOpen(true);
                    },
                    updatedPriority: updatedPriority,
                    updatedStatus: updatedStatus,
                    viewTicketStateOverride: viewTicketStateOverride
                  }}
                  internalChatStateProps={{
                    onAiButtonClicked: () => {
                      setIsAiHelpModalOpen(true);
                    }
                  }}
                  viewChatStateProps={{
                    permissions: ['my-tickets-single-ticket-send-message', 'my-tickets-transfer-chat'],
                    conversationId: viewChatStateProps.conversationId,
                    onChatEnded: () => setViewChatStateProps((prev: any) => ({ ...prev, conversationId: '' })),
                    onConvertToTicket: (memberId: string, conversationId: string) => {
                      setCreateTicketFromChat({ memberId, conversationId });
                      setIsCreateTicketModalOpen(true);
                    },
                    onViewMemberClicked: (memberId: string) => {
                      setModalMemberId(memberId);
                      setIsViewMemberModalOpen(true);
                    },
                  }}
                />
              </StateContainerProvider>

            </Box>
          </div>
        </DevTestOverrideProvider>
      </StateOverrideProvider>
      <ModalsProvider
        createTicketProps={{
          isOpen: isCreateTicketModalOpen,
          onClose: () => { setIsCreateTicketModalOpen(false); setCreateTicketFromChat(null); },
          agentId: loggedInAgent.agentId,
          userBetaFeatures: userBetaFeatures,
          initialMemberId: createTicketFromChat?.memberId,
          chatConversationId: createTicketFromChat?.conversationId
        }}
        teamProps={{
          isOpen: teamStateProps.isTeamModalOpen,
          onClose: () => { setTeamStateProps((prev: any) => ({ ...prev, isTeamModalOpen: false })); },
          state: teamStateProps.state,
          teamId: teamStateProps.teamId
        }}
        agentProps={{
          isOpen: agentStateProps.isAgentModalOpen,
          onClose: () => { setAgentStateProps((prev: any) => ({ ...prev, isAgentModalOpen: false })); },
          state: agentStateProps.state,
          agentId: agentStateProps.agentId
        }}
        aiProps={{
          isOpen: isAiHelpModalOpen,
          onClose: () => { setIsAiHelpModalOpen(false); },
          agentName: loggedInAgent.name,
          logoUrl: logoUrl,
          state: state
        }}
        priorityProps={{
          isOpen: isPriorityModalOpen,
          onClose: () => { setIsPriorityModalOpen(false); },
          ticketId: modalTicketId,
          onSuccess: (newPriority: string) => {
            setUpdatedPriority(newPriority);
            handleTicketUpdate(modalTicketId, { priority: newPriority });
          }
        }}
        statusProps={{
          isOpen: isStatusModalOpen,
          onClose: () => { setIsStatusModalOpen(false); },
          ticketId: modalTicketId,
          onSuccess: (newStatus: string) => {
            setUpdatedStatus(newStatus);
            handleTicketUpdate(modalTicketId, { status: newStatus });
          }
        }}
        transferProps={{
          isOpen: isTransferTicketModalOpen,
          onClose: () => { setIsTransferTicketModalOpen(false); },
          ticketId: modalTicketId
        }}
        viewMemberProps={{
          isOpen: isViewMemberModalOpen,
          onClose: () => { setIsViewMemberModalOpen(false); },
          memberId: modalMemberId
        }}
        assignTicketConfirmProps={{
          isOpen: isAssignTicketConfirmModalOpen,
          assignType: assignTicketConfirmModalAssignType,
          onClose: async ({ assigned }: { assigned: boolean }) => {
            setIsAssignTicketConfirmModalOpen(false);
            if (assigned) {
              await handleAssignAgent(modalTicketId, loggedInAgent.agentId, assignTicketConfirmModalAssignType);
            }
          }
        }}
        mergeTicketProps={{
          isOpen: isMergeTicketModalOpen,
          onClose: () => { setIsMergeTicketModalOpen(false); },
          primaryTicketId: mergeTicketPrimaryId,
          secondaryTicketId: "",
          onMergeComplete: (mergedTicketNumber: string) => {
            ShowToast({ message: `Tickets merged successfully into #${mergedTicketNumber}`, type: 'success' });
            // Optionally navigate to merged ticket or refresh current view
          },
          agentId: loggedInAgent.agentId
        }}
      />
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;
