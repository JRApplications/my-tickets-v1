export const useDemoData = () => {
    const demoTickets = DemoTickets;
    const demoSelectedTicket = DemoSelectedTicket;

    return {
        demoTickets,
        demoSelectedTicket
    };

}

const DemoTickets = [
    {
        id: '1',
        _id: '1',
        ticketId: 'TICKET-001',
        subject: 'Demo Ticket',
        status: 'Open',
        submittedDate: '2024-06-01'
    },
    {
        id: '2',
        _id: '2',
        ticketId: 'TICKET-002',
        subject: 'Another Demo Ticket',
        status: 'Closed',
        submittedDate: '2024-06-02'
    }
];

const DemoSelectedTicket = {
    id: '1',
    _id: '1',
    primaryTicketNumber: 'TICKET-001',
    communication: [
        {
            id: '2',
            _id: '2',
            sender: 'member',
            message: 'This is a demo response from support.',
            timestamp: '2024-06-01T11:00:00Z'
        },
        {
            id: '1',
            _id: '1',
            senderName: 'John Doe',
            senderType: 'agent',
            message: 'This is a demo message from the user.',
            timestamp: '2024-06-01T10:00:00Z'
        },
    ]
}
