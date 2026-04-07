import { useThemeStore } from '@/lib/themeStore';

/** Returns react-select `styles` prop with correct light/dark colours. */
export function useSelectStyles(extra?: Record<string, any>) {
    const theme = useThemeStore((s) => s.theme);
    const isDark = theme === 'dark';

    const bg = isDark ? 'hsl(222 47% 11%)' : '#ffffff';
    const border = isDark ? 'hsl(217 33% 25%)' : '#e2e8f0';
    const fg = isDark ? 'hsl(210 40% 96%)' : '#0f172a';
    const muted = isDark ? 'hsl(215 20% 55%)' : '#64748b';
    const accent = isDark ? 'hsl(217 33% 20%)' : '#f1f5f9';
    const accentFg = isDark ? 'hsl(210 40% 96%)' : '#0f172a';

    return {
        menuPortal: (base: any) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: bg,
            border: `1px solid ${border}`,
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.5)' : base.boxShadow,
            pointerEvents: 'auto',
        }),
        menuList: (base: any) => ({ ...base, padding: 4 }),
        control: (base: any, state: any) => ({
            ...base,
            minHeight: '36px',
            fontSize: '14px',
            backgroundColor: isDark ? 'hsl(222 47% 14%)' : base.backgroundColor,
            borderColor: state.isFocused ? 'hsl(217 91% 60%)' : border,
            boxShadow: state.isFocused ? `0 0 0 1px hsl(217 91% 60%)` : 'none',
            color: fg,
            '&:hover': { borderColor: state.isFocused ? 'hsl(217 91% 60%)' : border },
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected
                ? 'hsl(217 91% 60%)'
                : state.isFocused ? accent : 'transparent',
            color: state.isSelected ? '#ffffff' : accentFg,
            cursor: 'pointer',
            borderRadius: 4,
        }),
        singleValue: (base: any) => ({ ...base, color: fg }),
        input: (base: any) => ({ ...base, color: fg }),
        placeholder: (base: any) => ({ ...base, color: muted }),
        indicatorSeparator: (base: any) => ({ ...base, backgroundColor: border }),
        dropdownIndicator: (base: any) => ({ ...base, color: muted }),
        clearIndicator: (base: any) => ({ ...base, color: muted }),
        ...extra,
    };
}
