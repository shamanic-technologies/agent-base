"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppEventsProvider = AppEventsProvider;
exports.useAppEvents = useAppEvents;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AppEventsContext = (0, react_1.createContext)(null);
function AppEventsProvider({ children }) {
    const listeners = (0, react_1.useRef)({});
    const emit = (0, react_1.useCallback)((event) => {
        var _a;
        const eventListeners = (_a = listeners.current[event.type]) !== null && _a !== void 0 ? _a : [];
        eventListeners.forEach((callback) => callback(event));
    }, [listeners]);
    const on = (0, react_1.useCallback)((eventType, callback) => {
        var _a;
        listeners.current = {
            ...listeners.current,
            [eventType]: [...((_a = listeners.current[eventType]) !== null && _a !== void 0 ? _a : []), callback],
        };
    }, []);
    const off = (0, react_1.useCallback)((eventType, callback) => {
        var _a;
        listeners.current = {
            ...listeners.current,
            [eventType]: ((_a = listeners.current[eventType]) !== null && _a !== void 0 ? _a : []).filter((cb) => cb !== callback),
        };
    }, []);
    return ((0, jsx_runtime_1.jsx)(AppEventsContext.Provider, { value: { emit, on, off }, children: children }));
}
function useAppEvents() {
    const context = (0, react_1.useContext)(AppEventsContext);
    if (!context) {
        throw new Error('useAppEvents must be used within an AppEventsProvider');
    }
    return context;
}
