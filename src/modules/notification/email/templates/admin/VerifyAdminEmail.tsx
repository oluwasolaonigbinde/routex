import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from '../layouts/base.layout';
import { formatDistanceToNow } from 'date-fns';

export interface VerifyAdminEmailProps {
    firstName: string;
    verificationToken: string;
    expiresAt: Date;
}

export const VerifyAdminEmail = ({
    firstName,
    verificationToken,
    expiresAt,
}: VerifyAdminEmailProps) => {
    const expiresIn = formatDistanceToNow(expiresAt, { addSuffix: false });
    return (
        <BaseEmailLayout previewText="Verify your email address">
            <Section>
                <Text className="text-[22px] font-semibold text-purple-600 mb-4">
                    Verify your email address
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Hi {firstName},
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Please verify your email address to complete your
                    registration.
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Your verification code is:
                </Text>

                <Section className="bg-gray-100 p-4 rounded-lg text-center mb-4">
                    <Text className="text-2xl font-bold text-purple-600 tracking-widest m-0">
                        {verificationToken}
                    </Text>
                </Section>
                <Text className="text-xs text-gray-500 mt-4">
                    This verification code will expire in {expiresIn}. If you
                    didn&apos;t create an account with RouteX, please ignore
                    this email.
                </Text>
            </Section>
        </BaseEmailLayout>
    );
};
