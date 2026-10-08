const demoMessages: any[] = [
    {
        _id: '1',
        ticketId: 'ticket1',
        teamId: 'team1',
        senderId: 'user1',
        senderType: 'user',
        message: 'Hello, I need help with my ticket.',
        timestamp: Date.now(),
        senderName: 'John Doe'
    },
    {
        _id: '2',
        senderType: 'system',
        senderId: 'system',
        message: 'WAITING_FOR_AGENT',
        timestamp: Date.now() + 500
    },
    {
        _id: '3',
        senderType: 'system',
        senderId: 'system',
        message: 'AGENT_JOINED',
        timestamp: Date.now() + 500
    },
    {
        _id: '4',
        ticketId: 'ticket1',
        teamId: 'team1',
        senderId: 'agent1',
        senderType: 'agent',
        message: 'Hi John, I am here to help you. Can you please provide more details about the issue you are facing?',
        timestamp: Date.now() + 1000,
        senderName: 'Agent Smith'
    },
    {
        _id: '5',
        ticketId: 'ticket1',
        teamId: 'team1',
        senderId: 'user1',
        senderType: 'user',
        message: 'Sure, I am having trouble logging into my account.',
        timestamp: Date.now() + 2000,
        senderName: 'John Doe'
    },
    {
        _id: '6',
        ticketId: 'ticket1',
        teamId: 'team1',
        senderId: 'agent1',
        senderType: 'user',
        messageType: 'ATTACHMENT',
        attachment: {
            id: 'attachment1',
            name: 'screenshot.png',
            url: 'https://via.placeholder.com/150'
        },
        timestamp: Date.now() + 3000,
    }
]

export default demoMessages;
