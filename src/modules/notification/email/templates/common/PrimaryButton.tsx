import { Button } from '@react-email/components';
import React from 'react';

interface PrimaryButtonProps {
    href: string;
    children: React.ReactNode;
    className?: string;
}

export const PrimaryButton = ({
    href,
    children,
    className = '',
}: PrimaryButtonProps) => {
    const defaultClasses =
        'inline-block bg-purple-600 text-white py-3 px-5 rounded-lg text-sm font-medium no-underline';
    const combinedClasses = `${defaultClasses} ${className}`.trim();

    return (
        <Button href={href} className={combinedClasses}>
            {children}
        </Button>
    );
};
