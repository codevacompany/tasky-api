const ALLOWED_SUFFIXES = [
    'notification-dispatcher.service.ts',
    'notification.service.ts',
    'notification.repository.ts',
];

const FORBIDDEN_REPOSITORY_METHODS = ['save', 'create'];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Ticket notifications must use NotificationDispatcher',
        },
        messages: {
            forbidden: 'Use NotificationDispatcher.notify() instead of {{ method }}',
        },
    },
    create(context) {
        const file = context.getFilename().replace(/\\/g, '/');
        if (ALLOWED_SUFFIXES.some((suffix) => file.endsWith(suffix))) {
            return {};
        }

        const isTicketModule = /\/modules\/ticket(-comment)?\//.test(file);

        return {
            CallExpression(node) {
                const callee = node.callee;
                if (callee?.type !== 'MemberExpression' || callee.property?.type !== 'Identifier') {
                    return;
                }

                const method = callee.property.name;
                const object = callee.object;

                if (
                    object?.type === 'MemberExpression' &&
                    object.property?.name === 'notificationRepository' &&
                    FORBIDDEN_REPOSITORY_METHODS.includes(method)
                ) {
                    context.report({
                        node,
                        messageId: 'forbidden',
                        data: { method: `notificationRepository.${method}` },
                    });
                }

                if (method === 'sendEmailWithPermissionCheck') {
                    context.report({
                        node,
                        messageId: 'forbidden',
                        data: { method: 'sendEmailWithPermissionCheck' },
                    });
                }

                if (
                    isTicketModule &&
                    object?.type === 'MemberExpression' &&
                    object.property?.name === 'emailService' &&
                    method === 'sendMail'
                ) {
                    context.report({
                        node,
                        messageId: 'forbidden',
                        data: { method: 'emailService.sendMail' },
                    });
                }
            },
        };
    },
};
