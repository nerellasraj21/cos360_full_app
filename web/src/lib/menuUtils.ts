import { useAuthStore } from './authStore';
import { useQuery } from '@tanstack/react-query';

// TypeScript interfaces for the backend menu structure
export interface MenuItem {
    id: number;
    name: string;
    url: string | null;
    level: "L0" | "L1" | "L2";
    children?: MenuItem[];
}

const HIDDEN_MENU_ITEMS = new Set([
    'route stops',
    'transport trips',
]);

const isHiddenItem = (item: MenuItem): boolean =>
    HIDDEN_MENU_ITEMS.has(item.name.toLowerCase());

const isFeeItem = (item: MenuItem): boolean => {
    const url = item.url ?? '';
    const name = item.name.toLowerCase();
    return url.startsWith('/fee') || name === 'fee management' || name === 'fees';
};

const filterMenuForRole = (items: MenuItem[], roleName: string): MenuItem[] => {
    // Always hide these items regardless of role
    const visible = items.filter(item => !isHiddenItem(item));

    if (roleName === 'teacher') {
        return visible
            .filter(item => !isFeeItem(item))
            .map(item => ({
                ...item,
                children: item.children ? filterMenuForRole(item.children, roleName) : [],
            }));
    }

    // Students get a stripped-down Fee menu if the backend didn't include one
    if (roleName === 'student') {
        const hasFeeInMenu = visible.some(item => isFeeItem(item));
        if (!hasFeeInMenu) {
            return [
                ...visible,
                {
                    id: 99001,
                    name: 'Fee',
                    url: '/fee',
                    level: 'L0' as const,
                    children: [
                        { id: 99002, name: 'My Fees',     url: '/fee/my-fees',     level: 'L1' as const, children: [] },
                        { id: 99003, name: 'My Receipts', url: '/fee/my-receipts', level: 'L1' as const, children: [] },
                    ],
                },
            ];
        }
    }

    return visible.map(item => ({
        ...item,
        children: item.children ? filterMenuForRole(item.children, roleName) : [],
    }));
};


export const useMenuData = () => {
    const { menuItems, user, isAuthenticated, role } = useAuthStore();

    return useQuery({
        queryKey: ['menu', role?.name],
        queryFn: () => {
            console.log('Loading menu data from authStore - User:', user, 'Authenticated:', isAuthenticated);

            if (!menuItems || menuItems.length === 0) {
                console.warn('No menu data found in authStore, returning empty array');
                return [];
            }

            // Transform authStore menu format to menuUtils format
            const transformMenuItem = (item: { id: string; name: string; path: string | null; children?: { id: string; name: string; path: string | null; children?: any[] }[] }, level: number = 0): MenuItem => {
                const levelStr = level === 0 ? "L0" : level === 1 ? "L1" : "L2";

                return {
                    id: parseInt(item.id) || Math.floor(Math.random() * 10000), // Fallback for non-numeric ids
                    name: item.name,
                    url: item.path, // Map path to url
                    level: levelStr as "L0" | "L1" | "L2",
                    children: item.children ? item.children.map((child) => transformMenuItem(child, level + 1)) : []
                };
            };

            const transformedMenu = menuItems.map((item: any) => transformMenuItem(item, 0));
            const roleName = role?.name?.toLowerCase() ?? '';
            const filteredMenu = filterMenuForRole(transformedMenu, roleName);
            console.log('Transformed menu data:', filteredMenu);
            return filteredMenu;
        },
        enabled: !!user && !!menuItems && menuItems.length > 0
    });
};

// Utility function to find menu item by ID
export const findMenuItemById = (id: number, items: MenuItem[]): MenuItem | null => {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findMenuItemById(id, item.children);
            if (found) return found;
        }
    }
    return null;
};

// Utility function to get breadcrumb path for a menu item
export const getBreadcrumbPath = (id: number, items: MenuItem[]): MenuItem[] => {
    const path: MenuItem[] = [];

    const findPath = (targetId: number, currentItems: MenuItem[], currentPath: MenuItem[]): boolean => {
        for (const item of currentItems) {
            const newPath = [...currentPath, item];
            if (item.id === targetId) {
                path.push(...newPath);
                return true;
            }
            if (item.children && findPath(targetId, item.children, newPath)) {
                return true;
            }
        }
        return false;
    };

    findPath(id, items, []);
    return path;
}; 