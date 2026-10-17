import React, { useEffect, useRef } from 'react';
import { injectEditorStyles } from './helpers/injectEditorStyles';
import { useMemberTickets } from './hooks/useMemberTickets';
import type { FC } from 'react';
import ReactDOM from 'react-dom';
import reactToWebComponent from 'react-to-webcomponent';
import classNames from 'classnames';
import styles from './member-tickets.module.css';
import type { MemberTicketsProps } from './member-tickets.props';
import { components } from './states/tickets/components';
const {
  TicketCard,
  Dropdown,
  SearchInput,
  LoadingState,
  TicketCardListProvider,
  NoTicketsCard
} = components;
import { BackButton, TicketNumber, ReplyInput, SendButton, PoweredBy, LoadingState as SelectedTicketLoadingState } from './states/selectedTicket/components';
import { MessagesWrapper } from './states/selectedTicket/messagesWrapper/wrapper';

const MemberTickets: FC<MemberTicketsProps> = ({
  id,
  className,
}) => {
  const {
    state,
    selectedTicket,
    selectTicket,
    clearSelectedTicket,
    tickets,
    hasMoreTickets,
    isLoadingMoreTickets,
    ticketListError,
    loadMoreError,
    loadTickets,
    retryTickets,
    loadMoreTickets,
    sendMessage,
  } = useMemberTickets();
  // @ts-nocheck
  const [message, setMessage] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const previousFiltersRef = useRef({ search: searchQuery, status: statusFilter });

  useEffect(() => {
    if (state !== 'tickets' && state !== 'noTickets') return;
    const filters = { search: searchQuery, status: statusFilter };
    if (filters.search === previousFiltersRef.current.search && filters.status === previousFiltersRef.current.status) return;

    const timeoutId = window.setTimeout(() => {
      previousFiltersRef.current = filters;
      loadTickets({ search: searchQuery.trim(), status: statusFilter });
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadTickets, searchQuery, state, statusFilter]);

  useEffect(() => {
    injectEditorStyles();
  }, []);

  return (
    <div
      id={id}
      className={classNames('member-tickets', styles.memberTickets, className)}
    >
      {(state === 'loading') && (

        <LoadingState />

      )}

      {state === 'error' && (
        <div className={styles.TicketsLoadError} role="alert">
          <p>{ticketListError}</p>
          <button type="button" onClick={retryTickets}>Try again</button>
        </div>
      )}

      {state === 'tickets' && (
        <div className={classNames('TicketsWrapper', styles.TicketsWrapper)}>
          <div className={classNames('__TicketsActionsHeader', styles.__TicketsActionsHeader)}>
            <Dropdown value={statusFilter} onChange={setStatusFilter} />
            <SearchInput value={searchQuery} onInput={(e) => setSearchQuery(e.currentTarget.value)} />
          </div>
          <div className={styles.TicketsListRegion}>
            {tickets.length > 0 ? (
              <TicketCardListProvider>
                {tickets.map((ticket: any, index) => (
                  <TicketCard
                    key={ticket?._id}
                    className={index === 0 ? styles.ticketCardFirst : index === tickets.length - 1 ? styles.ticketCardLast : ""}
                    ticket={ticket}
                    onOpen={() => selectTicket(ticket?._id)}
                  />
                ))}
              </TicketCardListProvider>
            ) : (
              <div className={styles.TicketsFilteredEmpty} role="status">No tickets match your filters.</div>
            )}
            {loadMoreError && <div className={styles.TicketsLoadError} role="alert">{loadMoreError}</div>}
            {hasMoreTickets && (
              <button
                type="button"
                className={styles.LoadMoreTickets}
                onClick={loadMoreTickets}
                disabled={isLoadingMoreTickets}
              >
                {isLoadingMoreTickets ? 'Loading tickets…' : loadMoreError ? 'Retry loading tickets' : 'Load more tickets'}
              </button>
            )}
          </div>
        </div>
      )}

      {(state === 'noTickets') && (
        <NoTicketsCard onCreateTicket={() => window.myTickets?.openChat?.()} />
      )}

      {(state === 'selectedTicketLoading') && (

        <SelectedTicketLoadingState />

      )}

      {state === 'selectedTicket' && (

        <div className={classNames('SelectedTicketContainer', styles.SelectedTicketContainer)}>
          <div className={classNames('__Header', styles.__Header)}>
            <BackButton onClick={() => clearSelectedTicket()} />
            <TicketNumber ticketNumber={selectedTicket?.primaryTicketNumber || ''} />
          </div>
          <div className={classNames('__Content', styles.__Content)}>
            {selectedTicket?.expectedResponseBy && (
              <p className={classNames('__ExpectedResponse', styles.__ExpectedResponse)}>
                We aim to reply by {new Date(selectedTicket.expectedResponseBy).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            <MessagesWrapper messages={selectedTicket?.communication || []} />
            <div className={classNames('__ReplyContainer', styles.__ReplyContainer)}>
              <ReplyInput value={message} onChange={(e) => setMessage(e)} />
              <SendButton onClick={() => sendMessage(message).then(() => setMessage(''))} />
            </div>
          </div>
          <div className={classNames('__Footer', styles.__Footer)}>
            <PoweredBy />
          </div>
        </div>

      )}
    </div>
  );
};

const customElement = reactToWebComponent(
  MemberTickets,
  React,
  ReactDOM as any,
  {
    props: {
      id: 'string',
      className: 'string',
      state: 'string',
    },
  }
);

export default customElement;
