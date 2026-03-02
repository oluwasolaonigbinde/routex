import {
    CardChannel,
    InstantTransferChannel,
    WalletChannel,
} from '@/modules/payment/entities/payment';

export type PaystackPaymentChannels =
    | 'card'
    | 'bank'
    | 'apple_pay'
    | 'ussd'
    | 'qr'
    | 'mobile_money'
    | 'bank_transfer'
    | 'eft'
    | 'capitec_pay'
    | 'payattitude';

export type PaymentChannel =
    | CardChannel
    | WalletChannel
    | InstantTransferChannel;

export type PaystackWebhookRequest = {
    event: 'charge.success' | 'transfer.success';
    data: {
        id: number;
        domain: string;
        status: string;
        reference: string;
        amount: number;
        message: string | null;
        gateway_response: string;
        paid_at: string;
        created_at: string;
        channel: string;
        currency: string;
        ip_address: string;
        metadata: any;
        fees: number;
        customer: {
            email: string;
        };
        authorization: {
            authorization_code: string;
            card_type: string;
            last4: string;
            exp_month: string;
            exp_year: string;
            bin: string;
            bank: string;
            channel: string;
            signature: string;
            reusable: boolean;
            country_code: string;
            account_name: string | null;
        };
    };
};
