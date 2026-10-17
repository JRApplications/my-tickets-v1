import React, { useEffect } from 'react';
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

const normalizeTicketStatus = (status: unknown) =>
  String(status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

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
    sendMessage,
  } = useMemberTickets();
  // @ts-nocheck
  const [message, setMessage] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleTickets = tickets.filter((ticket: any) => {
    const matchesStatus = !statusFilter || normalizeTicketStatus(ticket.status) === statusFilter;
    const searchableText = [ticket.subject, ticket.ticketId, ticket.primaryTicketNumber, ticket.status]
      .filter((value) => value != null)
      .join(' ')
      .toLocaleLowerCase();
    return matchesStatus && (!normalizedSearchQuery || searchableText.includes(normalizedSearchQuery));
  });

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

      {state === 'tickets' && (
        <div className={classNames('TicketsWrapper', styles.TicketsWrapper)}>
          <div className={classNames('__TicketsActionsHeader', styles.__TicketsActionsHeader)}>
            <Dropdown value={statusFilter} onChange={setStatusFilter} />
            <SearchInput value={searchQuery} onInput={(e) => setSearchQuery(e.currentTarget.value)} />
          </div>
          {visibleTickets.length > 0 ? (
            <TicketCardListProvider>
              {visibleTickets.map((ticket: any, index) => (
                <TicketCard
                  key={ticket?._id}
                  className={index === 0 ? styles.ticketCardFirst : index === visibleTickets.length - 1 ? styles.ticketCardLast : ""}
                  ticket={ticket}
                  onOpen={() => selectTicket(ticket?._id)}
                />
              ))}
            </TicketCardListProvider>
          ) : (
            <div className={styles.TicketsFilteredEmpty} role="status">No tickets match your filters.</div>
          )}
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
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
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
