import { Section, Text } from '@react-email/components';
import { BaseEmailLayout } from '../layouts/base.layout';
import { PrimaryButton } from '../common/PrimaryButton';

export interface WelcomeEmailProps {
    firstName: string;
    websiteUrl: string;
}

export const WelcomeEmail = ({ firstName, websiteUrl }: WelcomeEmailProps) => {
    return (
        <BaseEmailLayout previewText="Welcome to RouteX!">
            <Section>
                <Text className="text-[22px] font-semibold text-purple-600 mb-4">
                    Welcome to RouteX 🚍
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Hi {firstName},
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Thank you for joining RouteX! We&apos;re excited to help you
                    navigate your city with ease and make your daily commute
                    more convenient.
                </Text>

                <Text className="text-sm text-gray-700 mb-3">
                    Get started by exploring available routes, booking your
                    first trip, and experiencing seamless mass transit.
                </Text>

                <PrimaryButton
                    href={new URL('/dashboard', websiteUrl).toString()}
                    className="mt-4"
                >
                    Get Started →
                </PrimaryButton>
            </Section>
        </BaseEmailLayout>
    );
};

export default WelcomeEmail;
