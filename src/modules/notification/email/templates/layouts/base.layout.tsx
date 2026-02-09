import {
    Html,
    Head,
    Preview,
    Body,
    Container,
    Section,
    Text,
    Link,
    Hr,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import React from 'react';

interface BaseEmailLayoutProps {
    previewText: string;
    children: React.ReactNode;
}

export const BaseEmailLayout = ({
    previewText,
    children,
}: BaseEmailLayoutProps) => {
    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-[#F6EEFF] font-sans">
                    <Container className="bg-white my-10 mx-auto rounded-xl overflow-hidden">
                        {/* Main content */}
                        <Section className="pt-2 pb-8 px-8">
                            {children}

                            {/* <div className="h-[2px] my-5 w-full bg-[#ECECEC]"></div> */}
                            <Hr className="my-4 bg-[#ECECEC]" />

                            {/* Footer */}
                            <Section className="py-2 px-3 bg-[#F7FCFF]">
                                <Text className="text-xs text-gray-500 my-1">
                                    Need help? Contact us at{' '}
                                    <Link
                                        href="mailto:support@routex.com"
                                        className="text-purple-600 underline"
                                    >
                                        support@routex.com
                                    </Link>
                                    .
                                </Text>
                                <Text className="text-xs text-gray-500 my-1">
                                    This is a system generated email from the
                                    RouteX admin console.
                                </Text>
                                <Text className="text-xs text-gray-500 my-1">
                                    Powered by RouteX.
                                </Text>
                            </Section>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};
