import { PropsWithChildren } from 'react';
type EmptyPayload = NonNullable<unknown>;
export interface BaseAppEventTypes {
    'user.signedIn': {
        userId: string;
    };
    'user.signedUp': {
        method: `magiclink` | `password`;
    };
    'user.updated': EmptyPayload;
    'checkout.started': {
        planId: string;
        account?: string;
    };
}
export type ConsumerProvidedEventTypes = EmptyPayload;
export type ExtendedAppEventTypes<T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes> = BaseAppEventTypes & T;
export type AppEventType<T extends ConsumerProvidedEventTypes> = keyof ExtendedAppEventTypes<T>;
export type AppEvent<T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes, K extends AppEventType<T> = AppEventType<T>> = {
    type: K;
    payload: ExtendedAppEventTypes<T>[K];
};
export type EventCallback<T extends ConsumerProvidedEventTypes, K extends AppEventType<T> = AppEventType<T>> = (event: AppEvent<T, K>) => void;
interface AppEventsContextType<T extends ConsumerProvidedEventTypes> {
    emit: <K extends AppEventType<T>>(event: AppEvent<T, K>) => void;
    on: <K extends AppEventType<T>>(eventType: K, callback: EventCallback<T, K>) => void;
    off: <K extends AppEventType<T>>(eventType: K, callback: EventCallback<T, K>) => void;
}
export declare function AppEventsProvider<T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes, K extends AppEventType<T> = AppEventType<T>>({ children }: PropsWithChildren): import("react/jsx-runtime").JSX.Element;
export declare function useAppEvents<T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes>(): AppEventsContextType<T>;
export {};
