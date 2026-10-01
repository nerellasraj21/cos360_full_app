import '@react-navigation/native';

declare module '@react-navigation/native' {
  export const __navigationDispatchMock: jest.Mock;
  export function __resetFormDirtyGuardNavMock(): void;
  export function __triggerBeforeRemove(action?: unknown): void;
}
