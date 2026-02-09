import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from '../layouts/base.layout';
import { formatDistanceToNow } from 'date-fns';

export interface PasswordResetEmailProps {
    firstName: string;
    resetToken: string;
    expiresAt: Date;
}

export const PasswordResetEmail = ({
    firstName,
    resetToken,
    expiresAt,
}: PasswordResetEmailProps) => {
    const expiresIn = formatDistanceToNow(expiresAt, { addSuffix: false });
    return (
        <BaseEmailLayout previewText="Reset your password">
            <Section>
                <Text className="text-[22px] font-semibold text-purple-600 mb-4">
                    Reset your password
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Hi {firstName},
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Use the OTP below to reset your password:
                </Text>

                <Section className="bg-gray-100 p-4 rounded-lg text-center mb-4">
                    <Text className="text-2xl font-bold text-purple-600 tracking-widest m-0">
                        {resetToken}
                    </Text>
                </Section>

                <Text className="text-xs text-gray-500 mt-4">
                    This code will expire in {expiresIn}. If you didn&apos;t
                    request this, please ignore this email.
                </Text>
            </Section>
        </BaseEmailLayout>
    );
};

export default PasswordResetEmail;
