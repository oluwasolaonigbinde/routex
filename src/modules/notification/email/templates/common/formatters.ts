export const formatCurrency = (
    amount: number,
    currency: string = 'NGN',
    locale: string = 'en-NG',
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
};
