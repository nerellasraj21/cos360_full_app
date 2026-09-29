// Manual mock for '@react-navigation/native', used by the
// use-form-dirty-guard / FormDirtyGuard test suite.
//
// Jest auto-applies a manual mock placed at <rootDir>/__mocks__/<pkg> for
// node_modules packages (no jest.mock() call needed), so this mock is live
// for every test file in the project. It replaces `useNavigation` and
// `usePreventRemove` with controllable fakes and passes everything else
// through untouched, so it stays safe for any other test that only needs
// e.g. useTheme/DefaultTheme from the real package.
//
// Test files drive it via the exported helpers:
//   const { __triggerBeforeRemove, __navigationDispatchMock, __resetFormDirtyGuardNavMock } = require('@react-navigation/native');

const actual = jest.requireActual('@react-navigation/native');

// Captures the arguments from the most recent usePreventRemove() call so
// __triggerBeforeRemove can decide whether to fire — this mirrors the real
// hook's own internal guard (`if (!preventRemove) return;`), so a
// "leave" attempt while the form is clean does nothing, just like in the app.
let latestPreventRemove = false;
let latestCallback = null;

const __navigationDispatchMock = jest.fn();

function useNavigation() {
  return { dispatch: __navigationDispatchMock };
}

function usePreventRemove(preventRemove, callback) {
  latestPreventRemove = preventRemove;
  latestCallback = callback;
}

/**
 * Simulate the navigator attempting to remove the screen — a back button
 * press, swipe-back gesture, hardware back, or router.back()/navigate away.
 * Only invokes the guard's callback if the screen is currently guarded
 * (isDirty && enabled), exactly like the real usePreventRemove.
 */
function __triggerBeforeRemove(action = { type: 'GO_BACK' }) {
  if (latestPreventRemove && latestCallback) {
    latestCallback({ data: { action } });
  }
}

function __resetFormDirtyGuardNavMock() {
  latestPreventRemove = false;
  latestCallback = null;
  __navigationDispatchMock.mockClear();
}

module.exports = {
  ...actual,
  useNavigation,
  usePreventRemove,
  __navigationDispatchMock,
  __triggerBeforeRemove,
  __resetFormDirtyGuardNavMock,
};
