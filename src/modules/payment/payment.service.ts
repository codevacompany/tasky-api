import { Injectable } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { PaymentStatus, PaymentMethod } from './entities/payment.entity';

@Injectable()
export class PaymentService {
    constructor(private paymentRepository: PaymentRepository) {}

    async findByTenantId(tenantId: number) {
        return this.paymentRepository.find({
            where: { tenantId },
            relations: ['tenantSubscription', 'tenantSubscription.subscriptionPlan'],
            order: { createdAt: 'DESC' },
        });
    }

    async findBySubscriptionId(tenantSubscriptionId: number) {
        return this.paymentRepository.find({
            where: { tenantSubscriptionId },
            order: { createdAt: 'DESC' },
        });
    }

    async findPendingPayments(tenantId: number) {
        return this.paymentRepository.find({
            where: {
                tenantId,
                status: PaymentStatus.PENDING,
            },
            relations: ['tenantSubscription', 'tenantSubscription.subscriptionPlan'],
            order: { dueDate: 'ASC' },
        });
    }

    async findOverduePayments(tenantId?: number) {
        const query = this.paymentRepository
            .createQueryBuilder('payment')
            .where('payment.status = :status', { status: PaymentStatus.PENDING })
            .andWhere('payment.dueDate < :now', { now: new Date() })
            .leftJoinAndSelect('payment.tenantSubscription', 'subscription')
            .leftJoinAndSelect('subscription.subscriptionPlan', 'plan')
            .orderBy('payment.dueDate', 'ASC');

        if (tenantId) {
            query.andWhere('payment.tenantId = :tenantId', { tenantId });
        }

        return query.getMany();
    }

    async createPayment(data: {
        tenantId: number;
        tenantSubscriptionId: number;
        amount: number;
        dueDate: Date;
        description?: string;
        method?: PaymentMethod;
    }) {
        const payment = this.paymentRepository.create({
            ...data,
            status: PaymentStatus.PENDING,
        });

        return this.paymentRepository.save(payment);
    }

    async createRecurringPayment(
        tenantSubscriptionId: number,
        tenantId: number,
        amount: number,
        dueDate: Date,
        description: string = 'Pagamento mensal da assinatura',
    ) {
        return this.createPayment({
            tenantId,
            tenantSubscriptionId,
            amount,
            dueDate,
            description,
        });
    }

    async markAsPaid(paymentId: number, method: PaymentMethod, externalTransactionId?: string) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Payment not found');
        }

        payment.status = PaymentStatus.COMPLETED;
        payment.method = method;
        payment.paidAt = new Date();
        payment.externalTransactionId = externalTransactionId;

        return this.paymentRepository.save(payment);
    }

    async markAsFailed(paymentId: number, reason?: string) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Payment not found');
        }

        payment.status = PaymentStatus.FAILED;
        if (reason) {
            payment.metadata = { ...payment.metadata, failureReason: reason };
        }

        return this.paymentRepository.save(payment);
    }

    async updatePaymentStatus(
        paymentId: number,
        status: PaymentStatus,
        metadata?: Record<string, any>,
    ) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Payment not found');
        }

        payment.status = status;
        if (metadata) {
            payment.metadata = { ...payment.metadata, ...metadata };
        }

        if (status === PaymentStatus.COMPLETED && !payment.paidAt) {
            payment.paidAt = new Date();
        }

        return this.paymentRepository.save(payment);
    }

    async generateInvoiceUrl(paymentId: number): Promise<string> {
        // This would integrate with a payment processor like Stripe, PagSeguro, etc.
        // For now, returning a mock URL
        return `https://api.tasky.com.br/invoices/${paymentId}`;
    }

    async setInvoiceUrl(paymentId: number, invoiceUrl: string) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Payment not found');
        }

        payment.invoiceUrl = invoiceUrl;
        return this.paymentRepository.save(payment);
    }

    async getPaymentHistory(tenantId: number, limit: number = 50, offset: number = 0) {
        return this.paymentRepository.find({
            where: { tenantId },
            relations: ['tenantSubscription', 'tenantSubscription.subscriptionPlan'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    async getPaymentStatistics(tenantId: number) {
        const [totalPaid, totalPending, totalFailed] = await Promise.all([
            this.paymentRepository.count({
                where: { tenantId, status: PaymentStatus.COMPLETED },
            }),
            this.paymentRepository.count({
                where: { tenantId, status: PaymentStatus.PENDING },
            }),
            this.paymentRepository.count({
                where: { tenantId, status: PaymentStatus.FAILED },
            }),
        ]);

        const totalAmount = await this.paymentRepository
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'total')
            .where('payment.tenantId = :tenantId', { tenantId })
            .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
            .getRawOne();

        return {
            totalPaid,
            totalPending,
            totalFailed,
            totalAmountPaid: parseFloat(totalAmount?.total || '0'),
        };
    }

    async retryFailedPayment(paymentId: number) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== PaymentStatus.FAILED) {
            throw new Error('Payment is not in failed status');
        }

        payment.status = PaymentStatus.PENDING;
        payment.metadata = {
            ...payment.metadata,
            retryCount: (payment.metadata?.retryCount || 0) + 1,
        };

        return this.paymentRepository.save(payment);
    }
}
