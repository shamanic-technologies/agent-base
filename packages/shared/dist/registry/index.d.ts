/**
 * Implementation factory type
 */
export type ImplementationFactory<T> = () => T | Promise<T>;
/**
 * Public API types with improved get method
 */
export interface Registry<T, Names extends string> {
    register: (name: Names, factory: ImplementationFactory<T>) => Registry<T, Names>;
    get: {
        <K extends Names>(name: K): Promise<T>;
        <K extends [Names, ...Names[]]>(...names: K): Promise<{
            [P in keyof K]: T;
        }>;
    };
    setup: (group?: string) => Promise<void>;
    addSetup: (group: string, callback: () => Promise<void>) => Registry<T, Names>;
}
/**
 * @name createRegistry
 * @description Creates a new registry instance with the provided implementations.
 * @returns A new registry instance.
 */
export declare function createRegistry<T, Names extends string = string>(): Registry<T, Names>;
