import React from 'react';
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
    sendMessage,
  } = useMemberTickets();
  // @ts-nocheck
  const [message, setMessage] = React.useState('');

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
            <Dropdown />
            <SearchInput value="" onInput={(e) => console.log(e.currentTarget.value)} />
          </div>
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
        </div>
      )}

      {(state === 'noTickets') && (

        <NoTicketsCard onCreateTicket={() => console.log('Create ticket clicked')} />

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