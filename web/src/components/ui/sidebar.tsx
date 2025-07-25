import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Home,
    Calendar,
    MessageSquare,
    Folder,
    ShoppingCart,
    Bitcoin,
    Mail,
    FileText,
    Users,
    Settings,
    ChevronDown,
    LogOut,
    BookOpen,
    GraduationCap,
    Building,
    Sun,
    Moon,
    X,
} from "lucide-react";
import clsx from "clsx";
import { useLogoutMutation } from "../../api/auth";
import { useNavigate } from "@tanstack/react-router";
import type { MenuItem } from "../../lib/menuUtils";
import { useThemeStore } from "../../lib/themeStore";

interface SidebarProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    menuData?: MenuItem[];
    isMobile?: boolean;
}

// Icon mapping utility
const getIconForMenuItem = (name: string) => {
    const iconMap: Record<string, any> = {
        Dashboard: Home,
        Masters: Building,
        Classes: GraduationCap,
        Sections: Users,
        Academics: BookOpen,
        Curriculum: FileText,
        Subjects: BookOpen,
        Syllabus: FileText,
        Calendar: Calendar,
        Chat: MessageSquare,
        "File Manager": Folder,
        Ecommerce: ShoppingCart,
        Crypto: Bitcoin,
        Email: Mail,
        Invoices: FileText,
        Projects: Folder,
        Settings: Settings,
    };
    
    return iconMap[name] || Folder; 
};

function RecursiveMenuItem({ 
    item, 
    open, 
    expandedMenus, 
    onExpand, 
    hoveredMenu,
    onMouseEnter,
    onMouseLeave,
    level = 0,
    isMobile = false,
    onItemClick
}: { 
    item: MenuItem; 
    open: boolean; 
    expandedMenus: Set<number>;
    onExpand: (id: number) => void; 
    hoveredMenu: number | null;
    onMouseEnter: (id: number, hasChildren: boolean, event: React.MouseEvent) => void;
    onMouseLeave: () => void;
    level?: number;
    isMobile?: boolean;
    onItemClick?: () => void;
}) {
    const Icon = getIconForMenuItem(item.name);
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isExpanded = expandedMenus.has(item.id);
    const isHovered = hoveredMenu === item.id;
    const navigate = useNavigate();
    
    const handleClick = () => {
        if (hasChildren) {
            onExpand(item.id);
        } else if (item.url) {
            navigate({ to: item.url });
            if (isMobile && onItemClick) {
                onItemClick();
            }
        }
    };

    return (
        <div className="relative">
            <button
                className={clsx(
                    "flex items-center w-full gap-3 px-3 cursor-pointer py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors group text-left",
                    open ? "justify-start" : "justify-center",
                    level > 0 && "ml-4 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-sidebar"
                )}
                onClick={handleClick}
                onMouseEnter={(e) => !isMobile && onMouseEnter(item.id, hasChildren, e)}
                onMouseLeave={!isMobile ? onMouseLeave : undefined}
                tabIndex={0}
                aria-label={item.name}
                aria-expanded={hasChildren ? isExpanded : undefined}
            >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                    className={clsx(
                        "transition-all duration-200 font-medium",
                        open ? "opacity-100 ml-1" : "opacity-0 w-0 overflow-hidden"
                    )}
                >
                    {item.name}
                </span>
                {hasChildren && open && (
                    <ChevronDown
                        className={clsx(
                            "w-4 h-4 ml-auto transition-transform flex-shrink-0",
                            isExpanded ? "rotate-180" : "rotate-0"
                        )}
                    />
                )}
            </button>
            
            {hasChildren && open && isExpanded && item.children && (
                <ul className="space-y-1 text-sm text-muted-foreground pl-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                    {item.children.map((child) => (
                        <li key={child.id}>
                            <RecursiveMenuItem
                                item={child}
                                open={open}
                                expandedMenus={expandedMenus}
                                onExpand={onExpand}
                                hoveredMenu={hoveredMenu}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                level={level + 1}
                                isMobile={isMobile}
                                onItemClick={onItemClick}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function Sidebar({
    open: controlledOpen,
    onOpenChange,
    menuData = [],
    isMobile = false
}: SidebarProps) {
    const [open, setOpen] = useState(controlledOpen ?? !isMobile);
    const isControlled = controlledOpen !== undefined;
    const sidebarOpen = isControlled ? controlledOpen : open;
    
    
    // Track which menus are expanded by ID
    const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

    // Multi-level floating menu state (disabled on mobile)
    const [hoveredPath, setHoveredPath] = useState<number[]>([]);
    const [hoveredPositions, setHoveredPositions] = useState<{ top: number; left: number }[]>([]);
    const [isHoveringSubmenu, setIsHoveringSubmenu] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const logoutMutation = useLogoutMutation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logoutMutation.mutate(undefined, {
            onSuccess: () => {
                navigate({ to: '/login' });
            }
        });
    };

    // Helper to handle expand/collapse
    const handleExpand = (id: number) => {
        if (sidebarOpen) {
            setExpandedMenus((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                return newSet;
            });
        }
    };

    // Close sidebar when clicking menu item on mobile
    const handleItemClick = () => {
        if (isMobile && onOpenChange) {
            onOpenChange(false);
        }
    };

    // Multi-level hover logic for collapsed sidebar (desktop only)
    const handleMouseEnter = (item: MenuItem, level: number, event: React.MouseEvent) => {
        if (!sidebarOpen && !isMobile) {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }
            // Calculate position for this panel
            const rect = event.currentTarget.getBoundingClientRect();
            setHoveredPath((prev) => {
                const newPath = prev.slice(0, level);
                newPath[level] = item.id;
                return newPath;
            });
            setHoveredPositions((prev) => {
                const newPositions = prev.slice(0, level);
                newPositions[level] = {
                    top: rect.top,
                    left: rect.right + (level * 8), // 8px gap between panels
                };
                return newPositions;
            });
        }
    };

    const handleMouseLeave = () => {
        if (isHoveringSubmenu || isMobile) return;
        closeTimeoutRef.current = setTimeout(() => {
            setHoveredPath([]);
            setHoveredPositions([]);
            setIsHoveringSubmenu(false);
        }, 200);
    };

    const handleSubmenuMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsHoveringSubmenu(true);
    };

    const handleSubmenuMouseLeave = () => {
        setIsHoveringSubmenu(false);
        closeTimeoutRef.current = setTimeout(() => {
            setHoveredPath([]);
            setHoveredPositions([]);
            setIsHoveringSubmenu(false);
        }, 200);
    };

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    // Helper to get menu items for a given path
    function getMenuItemsForPath(path: number[], menu: MenuItem[]): MenuItem[] {
        let items = menu;
        for (const id of path) {
            const found = items.find((i) => i.id === id);
            if (found && found.children) {
                items = found.children;
            } else {
                return [];
            }
        }
        return items;
    }

    return (
        <aside
            className={clsx(
                "h-screen fixed top-0 left-0 z-50 bg-sidebar text-sidebar-foreground border-r transition-all duration-300 flex flex-col",
                isMobile 
                    ? clsx(
                        "w-64", // Full width on mobile
                        sidebarOpen ? "translate-x-0" : "-translate-x-full" // Slide animation
                    )
                    : clsx(
                        sidebarOpen ? "w-16 lg:w-64" : "w-16" // Responsive width on desktop
                    )
            )}
            onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        >
            {/* Logo and Close Button */}
            <div className="flex items-center justify-between h-16 px-4 border-b">
                {(sidebarOpen && !isMobile) || isMobile ? (
                    <span className="font-bold text-xl tracking-tight transition-all">COS360</span>
                ) : (
                    <span className="w-8 h-8 mx-auto flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary/20" />
                            <text x="16" y="21" textAnchor="middle" fontSize="16" fill="currentColor" fontFamily="Arial" fontWeight="bold">C</text>
                        </svg>
                    </span>
                )}
                
                {/* Close button for mobile */}
                {isMobile && (
                    <button
                        onClick={() => onOpenChange?.(false)}
                        className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            {/* Menu */}
            <nav className="flex-1 overflow-y-auto p-4">
                <div className={clsx(
                    "px-2 text-xs font-semibold cursor-pointer text-muted-foreground mb-3 transition-opacity duration-200 uppercase tracking-wider",
                    (sidebarOpen || isMobile) ? "opacity-100" : "opacity-0"
                )}>
                    Menu
                </div>
                <ul className="space-y-1">
                    {menuData.map((item) => (
                        <li key={item.id}>
                            <RecursiveMenuItem
                                item={item}
                                open={sidebarOpen || isMobile}
                                expandedMenus={expandedMenus}
                                onExpand={handleExpand}
                                hoveredMenu={null}
                                onMouseEnter={(id, hasChildren, e) => handleMouseEnter(item, 0, e)}
                                onMouseLeave={handleMouseLeave}
                                isMobile={isMobile}
                                onItemClick={handleItemClick}
                            />
                        </li>
                    ))}
                </ul>
            </nav>
            
            {/* Multi-level floating submenu portal - desktop only */}
            {!sidebarOpen && !isMobile && hoveredPath.length > 0 && hoveredPositions.length > 0 && (
                createPortal(
                    hoveredPath.map((id, level) => {
                        const parentPath = hoveredPath.slice(0, level);
                        const parentItems = getMenuItemsForPath(parentPath, menuData);
                        const thisItem = parentItems.find(i => i.id === id);
                        if (!thisItem) return null;
                        const pos = hoveredPositions[level];
                        const itemsToShow = thisItem.children || [];
                        const isLevel0 = thisItem.level === 'L0' || level === 0;
                        const hasChildren = itemsToShow.length > 0;
                        if (!isLevel0 && !hasChildren) return null;
                        // If no children and has a link, show only the link as a button (no heading)
                        if (!hasChildren && thisItem.url) {
                            return isLevel0 ? (
                                <div
                                    key={id}
                                    className="fixed bg-sidebar border border-border rounded-lg shadow-xl py-2 px-4 z-[100] min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-200"
                                    style={{
                                        top: pos.top,
                                        left: pos.left
                                    }}
                                    onMouseEnter={handleSubmenuMouseEnter}
                                    onMouseLeave={handleSubmenuMouseLeave}
                                >
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        <li>
                                            <button
                                                className="w-full cursor-pointer text-left px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors font-medium"
                                                onClick={() => {
                                                    if (thisItem.url) {
                                                        navigate({ to: thisItem.url as string });
                                                    }
                                                    setHoveredPath([]);
                                                    setHoveredPositions([]);
                                                    setIsHoveringSubmenu(false);
                                                }}
                                            >
                                                {thisItem.name}
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            ) : null;
                        }
                        // If has children, show heading and children
                        if (hasChildren) {
                            return (
                                <div
                                    key={id}
                                    className="fixed bg-sidebar border border-border rounded-lg shadow-xl py-3 px-4 z-[100] min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-200"
                                    style={{
                                        top: pos.top,
                                        left: pos.left
                                    }}
                                    onMouseEnter={handleSubmenuMouseEnter}
                                    onMouseLeave={handleSubmenuMouseLeave}
                                >
                                    <div className="text-sm font-semibold text-sidebar-foreground mb-3 pb-2 border-b border-border">
                                        {thisItem.name}
                                    </div>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        {itemsToShow.map((child) => (
                                            <li key={child.id}>
                                                <button
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors font-medium"
                                                    onMouseEnter={(e) => handleMouseEnter(child, level + 1, e)}
                                                    onClick={() => {
                                                        if (child.url) {
                                                            navigate({ to: child.url as string });
                                                        }
                                                        setHoveredPath([]);
                                                        setHoveredPositions([]);
                                                        setIsHoveringSubmenu(false);
                                                    }}
                                                >
                                                    {child.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }
                        return null;
                    }),
                    document.body
                )
            )}
        </aside>
    );
}