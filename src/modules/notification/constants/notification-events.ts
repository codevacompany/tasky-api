import { NotificationType } from '../entities/notification.entity';

export enum NotificationEvent {
    TICKET_ASSIGNED_TO_ME = 'TICKET_ASSIGNED_TO_ME',
    TICKET_ASSIGNED_AS_REVIEWER = 'TICKET_ASSIGNED_AS_REVIEWER',
    TICKET_ASSIGNEE_ADDED = 'TICKET_ASSIGNEE_ADDED',
    TICKET_SENT_TO_VERIFICATION = 'TICKET_SENT_TO_VERIFICATION',
    TICKET_REJECTED = 'TICKET_REJECTED',
    TICKET_CANCELLED = 'TICKET_CANCELLED',
    CORRECTION_REQUESTED = 'CORRECTION_REQUESTED',
    COMMENT_MENTION = 'COMMENT_MENTION',
    TICKET_FIELD_UPDATED = 'TICKET_FIELD_UPDATED',
    TICKET_ACCEPTED = 'TICKET_ACCEPTED',
    TICKET_APPROVED = 'TICKET_APPROVED',
    TICKET_ASSIGNEE_REMOVED = 'TICKET_ASSIGNEE_REMOVED',
    COMMENT_ON_TICKET = 'COMMENT_ON_TICKET',
    TICKET_REVIEWER_CHANGED = 'TICKET_REVIEWER_CHANGED',
}

export type NotificationEventGroup = 'atribuicoes' | 'status' | 'comentarios' | 'atualizacoes';

export interface NotificationEventDefinition {
    event: NotificationEvent;
    label: string;
    description: string;
    group: NotificationEventGroup;
    groupLabel: string;
    type: NotificationType;
    required: boolean;
    supportsEmail: boolean;
}

export const NOTIFICATION_EVENT_GROUP_LABELS: Record<NotificationEventGroup, string> = {
    atribuicoes: 'Atribuições',
    status: 'Status',
    comentarios: 'Comentários',
    atualizacoes: 'Atualizações',
};

export const NOTIFICATION_EVENT_CATALOG: NotificationEventDefinition[] = [
    {
        event: NotificationEvent.TICKET_ASSIGNED_TO_ME,
        label: 'Nova tarefa atribuída a mim',
        description: 'Quando alguém cria ou atribui uma tarefa para você',
        group: 'atribuicoes',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.atribuicoes,
        type: NotificationType.Open,
        required: true,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.TICKET_ASSIGNED_AS_REVIEWER,
        label: 'Nova tarefa para revisar',
        description: 'Quando você é designado como revisor de uma tarefa',
        group: 'atribuicoes',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.atribuicoes,
        type: NotificationType.Open,
        required: true,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.TICKET_ASSIGNEE_ADDED,
        label: 'Fui adicionado a uma tarefa',
        description: 'Quando você é adicionado como responsável',
        group: 'atribuicoes',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.atribuicoes,
        type: NotificationType.TicketUpdate,
        required: true,
        supportsEmail: false,
    },
    {
        event: NotificationEvent.TICKET_ASSIGNEE_REMOVED,
        label: 'Removido de uma tarefa',
        description: 'Quando você deixa de ser responsável por uma tarefa',
        group: 'atribuicoes',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.atribuicoes,
        type: NotificationType.TicketUpdate,
        required: false,
        supportsEmail: false,
    },
    {
        event: NotificationEvent.TICKET_REVIEWER_CHANGED,
        label: 'Revisor alterado',
        description: 'Quando você é definido como revisor de uma tarefa',
        group: 'atribuicoes',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.atribuicoes,
        type: NotificationType.TicketUpdate,
        required: false,
        supportsEmail: false,
    },
    {
        event: NotificationEvent.TICKET_SENT_TO_VERIFICATION,
        label: 'Tarefa enviada para verificação',
        description: 'Quando uma tarefa é enviada para verificação',
        group: 'status',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.status,
        type: NotificationType.StatusUpdate,
        required: true,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.TICKET_REJECTED,
        label: 'Tarefa reprovada',
        description: 'Quando uma tarefa que você trabalha é reprovada',
        group: 'status',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.status,
        type: NotificationType.StatusUpdate,
        required: false,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.TICKET_CANCELLED,
        label: 'Tarefa cancelada',
        description: 'Quando uma tarefa é cancelada',
        group: 'status',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.status,
        type: NotificationType.Cancellation,
        required: false,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.CORRECTION_REQUESTED,
        label: 'Correção solicitada',
        description: 'Quando é solicitada uma correção em uma tarefa',
        group: 'status',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.status,
        type: NotificationType.CorrectionRequest,
        required: true,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.TICKET_ACCEPTED,
        label: 'Tarefa aceita',
        description: 'Quando um responsável aceita a tarefa',
        group: 'status',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.status,
        type: NotificationType.StatusUpdate,
        required: false,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.TICKET_APPROVED,
        label: 'Tarefa aprovada',
        description: 'Quando uma tarefa é aprovada pelo revisor',
        group: 'status',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.status,
        type: NotificationType.StatusUpdate,
        required: false,
        supportsEmail: true,
    },
    {
        event: NotificationEvent.COMMENT_MENTION,
        label: 'Menção em comentário',
        description: 'Quando alguém menciona você em um comentário',
        group: 'comentarios',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.comentarios,
        type: NotificationType.Comment,
        required: true,
        supportsEmail: false,
    },
    {
        event: NotificationEvent.COMMENT_ON_TICKET,
        label: 'Comentário em tarefa',
        description: 'Quando alguém comenta em uma tarefa que você acompanha',
        group: 'comentarios',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.comentarios,
        type: NotificationType.Comment,
        required: false,
        supportsEmail: false,
    },
    {
        event: NotificationEvent.TICKET_FIELD_UPDATED,
        label: 'Tarefa atualizada',
        description: 'Quando alguém altera campos da tarefa',
        group: 'atualizacoes',
        groupLabel: NOTIFICATION_EVENT_GROUP_LABELS.atualizacoes,
        type: NotificationType.TicketUpdate,
        required: false,
        supportsEmail: false,
    },
];

const catalogByEvent = new Map(
    NOTIFICATION_EVENT_CATALOG.map((definition) => [definition.event, definition]),
);

export function getNotificationEventDefinition(
    event: NotificationEvent,
): NotificationEventDefinition {
    const definition = catalogByEvent.get(event);
    if (!definition) {
        throw new Error(`Unknown notification event: ${event}`);
    }
    return definition;
}

export function isValidNotificationEvent(value: string): value is NotificationEvent {
    return catalogByEvent.has(value as NotificationEvent);
}

export const ALL_NOTIFICATION_EVENTS = NOTIFICATION_EVENT_CATALOG.map((item) => item.event);
