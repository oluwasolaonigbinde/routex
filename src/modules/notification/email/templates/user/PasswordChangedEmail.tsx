import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from '../layouts/base.layout';

export interface PasswordChangedEmailProps {
    firstName: string;
}

export const PasswordChangedEmail = ({
    firstName,
}: PasswordChangedEmailProps) => {
    return (
        <BaseEmailLayout previewText="Your password has been changed">
            <Section>
                <Text className="text-[22px] font-semibold text-purple-600 mb-4">
                    Your password has been changed
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Hi {firstName},
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Your RouteX account password was successfully changed. If
                    you made this change, no further action is required.
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    If you did not request this, please ignore this email or
                    contact support immediately.
                </Text>
            </Section>
        </BaseEmailLayout>
    );
};

export default PasswordChangedEmail;
