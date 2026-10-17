import React from 'react';
import type { FC } from 'react';
import classNames from 'classnames';
import styles from './member-tickets.module.css';
import type { MemberTicketsProps } from './member-tickets.props';
import { isMemberTicketsDesignElement } from '../../member-tickets-embed-script-config.types';
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
import { useDemoData } from './states/hooks/useDemoData';

const normalizeTicketStatus = (status: unknown) =>
  String(status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const MemberTickets: FC<MemberTicketsProps> = ({
  id,
  className,
  state,
  selectedDesignElement,
  onDesignElementSelect,
}) => {
  const { demoTickets, demoSelectedTicket } = useDemoData();
  const [message, setMessage] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleDemoTickets = demoTickets.filter((ticket) => {
    const matchesStatus = !statusFilter || normalizeTicketStatus(ticket.status) === statusFilter;
    const searchableText = [ticket.subject, ticket.ticketId, ticket.status]
      .filter((value) => value != null)
      .join(' ')
      .toLocaleLowerCase();
    return matchesStatus && (!normalizedSearchQuery || searchableText.includes(normalizedSearchQuery));
  });

  React.useEffect(() => {
    const root = document.getElementById(id ?? '');
    if (!root) return;
    root.removeAttribute('data-design-selected');
    root.querySelectorAll('[data-design-selected="true"]').forEach((selected) => {
      selected.removeAttribute('data-design-selected');
    });
    if (selectedDesignElement) {
      if (root.dataset.designId === selectedDesignElement.id) {
        root.setAttribute('data-design-selected', 'true');
        return;
      }
      const selected = Array.from(root.querySelectorAll<HTMLElement>('[data-design-id]'))
        .find((element) => element.dataset.designId === selectedDesignElement.id);
      selected?.setAttribute('data-design-selected', 'true');
    }
  }, [id, selectedDesignElement]);

  return (
    <div
      id={id}
      className={classNames('member-tickets', styles.memberTickets, className)}
      data-design-element="widget"
      data-design-id="widget"
      onClickCapture={(event) => {
        const target = event.target;
        const element = target instanceof Element
          ? target.closest<HTMLElement>('[data-design-element][data-design-id]')
          : null;
        const designElement = element?.dataset.designElement;
        if (isMemberTicketsDesignElement(designElement)) {
          const root = event.currentTarget;
          root.querySelectorAll('[data-design-selected="true"]').forEach((selected) => {
            selected.removeAttribute('data-design-selected');
          });
          element?.setAttribute('data-design-selected', 'true');
          onDesignElementSelect?.({ element: designElement, id: element?.dataset.designId ?? designElement });
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDownCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        width: '100%',
        height: '100%',
        zIndex: 999,
        userSelect: 'none',
      }}
    >
      {(state === 'loading') && (

        <LoadingState />

      )}

      {state === 'tickets' && (
        <div className={classNames('TicketsWrapper', styles.TicketsWrapper)}>
          <div className={classNames('__TicketsActionsHeader', styles.__TicketsActionsHeader)}>
            <div data-design-element="filterDropdown" data-design-id="filter-dropdown"><Dropdown disabled value={statusFilter} onChange={setStatusFilter} /></div>
            <div data-design-element="searchInput" data-design-id="search-input"><SearchInput value={searchQuery} onInput={(e) => setSearchQuery(e.currentTarget.value)} /></div>
          </div>
          {visibleDemoTickets.length > 0 ? (
            <TicketCardListProvider>
              {visibleDemoTickets.map((ticket, index) => (
                <TicketCard
                  key={ticket.id}
                  className={index === 0 ? styles.ticketCardFirst : index === visibleDemoTickets.length - 1 ? styles.ticketCardLast : ""}
                  ticket={ticket}
                  onOpen={() => { }}
                />
              ))}
            </TicketCardListProvider>
          ) : (
            <div className={styles.TicketsFilteredEmpty} role="status">No tickets match your filters.</div>
          )}
        </div>
      )}

      {(state === 'noTickets') && (

        <NoTicketsCard onCreateTicket={() => {}} />

      )}

      {(state === 'selectedTicketLoading') && (

        <SelectedTicketLoadingState />

      )}

      {state === 'selectedTicket' && (

        <div className={classNames('SelectedTicketContainer', styles.SelectedTicketContainer)}>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
          <div className={classNames('__Header', styles.__Header)}>
            <BackButton onClick={() => { }} />
            <TicketNumber ticketNumber={demoSelectedTicket?.primaryTicketNumber || ''} />
          </div>
          <div className={classNames('__Content', styles.__Content)}>
            <MessagesWrapper messages={demoSelectedTicket?.communication || []} />
            <div className={classNames('__ReplyContainer', styles.__ReplyContainer)}>
              <ReplyInput value={message} onChange={(e) => setMessage(e)} />
              <SendButton onClick={() => { }} />
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

export default MemberTickets;
