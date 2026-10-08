declare namespace App {
    interface Locals {
        myTicketsRequestId?: string;
        myTicketsIdentity?: {
            agentId: string;
            teamId: string;
            roleId: string;
        };
    }
}
