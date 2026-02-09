export type CommonKeys<T, U> = keyof T & keyof U;

export type CommonProps<T, U> = {
    [K in CommonKeys<T, U>]: T[K] extends U[K] ? T[K] : never;
};
