import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    // UI / layout (keep)
    Home,
    Folder,
    ChevronDown,
    LogOut,
    Sun,
    Moon,
    X,
    // New top-level module icons
    LayoutDashboard,
    Database,
    GraduationCap,
    Briefcase,
    Banknote,
    Wallet,
    Bus,
    Send,
    // Calendar variants
    Calendar,
    CalendarDays,
    CalendarRange,
    CalendarOff,
    CalendarClock,
    // Masters
    School,
    Layers,
    BookOpen,
    BookMarked,
    ScrollText,
    Tag,
    Tags,
    GitBranch,
    Users,
    Users2,
    ShieldCheck,
    // Student / Staff
    UserPlus,
    UserCheck,
    UserRound,
    FolderOpen,
    BadgeCheck,
    ClipboardCheck,
    // Fee / Expense / Finance
    ArrowLeftRight,
    Receipt,
    RotateCcw,
    BarChart2,
    BarChart3,
    IndianRupee,
    Building2,
    CheckCircle2,
    // Settings / Audit
    Settings,
    Settings2,
    History,
    // Transport
    Route as RouteIcon,
    MapPin,
    Truck,
    Navigation,
    // Exam
    ClipboardList,
    PenLine,
    Pencil,
    Ticket,
    Trophy,
    Download,
    Table2,
    LayoutGrid,
    LayoutTemplate,
    ListChecks,
    // Communication / Notifications
    MessageSquare,
    Bell,
    // Admin / User management
    UserCog,
    Lock,
    LayoutList,
    // Misc legacy (keep for any unmapped menu items)
    ShoppingCart,
    Bitcoin,
    Mail,
    FileText,
} from "lucide-react";
import clsx from "clsx";
import { useLogoutMutation } from "../../api/auth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import type { MenuItem } from "../../lib/menuUtils";
import { useThemeStore } from "../../lib/themeStore";

interface SidebarProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    menuData?: MenuItem[];
    isMobile?: boolean;
}

// Icon mapping utility
export const getIconForMenuItem = (name: string) => {
    const iconMap: Record<string, any> = {
        // ── Top-level modules ──────────────────────────────────────────────────
        Dashboard: LayoutDashboard,
        Masters: Database,
        Students: GraduationCap,
        Staff: Briefcase,
        "Staff Management": Briefcase,
        "Fee Management": Banknote,
        Fee: Banknote,
        Expense: Wallet,
        Transport: Bus,
        "Exam Management": ClipboardList,
        "Exam Dashboard": ClipboardList,
        Communication: Send,
        Calendar: CalendarDays,
        Timetable: LayoutGrid,
        "Timetable Management": LayoutGrid,
        Administration: Building2,

        // ── Masters submodules ─────────────────────────────────────────────────
        "School Registration": School,
        Classes: School,
        Sections: Layers,
        Academics: BookOpen,
        Curriculum: BookMarked,
        Subjects: BookMarked,
        Syllabus: ScrollText,
        "Academic Years": CalendarRange,
        "Classes & Sections": LayoutGrid,
        "Classes and Sections": LayoutGrid,
        "Subject Categories": Tag,
        "Class Subject Mappings": GitBranch,
        Parents: Users2,
        "Roles & Permissions": ShieldCheck,
        "User Management": UserCog,
        "Role Management": ShieldCheck,
        "Permission Management": Lock,
        "Menu Management": LayoutList,
        Holidays: CalendarOff,

        // ── Students submodules ────────────────────────────────────────────────
        Admission: UserPlus,
        "Student Admission": UserPlus,
        Attendance: UserCheck,
        "Student Attendance": UserCheck,
        Certificates: ScrollText,
        "Certificate Types": Tag,
        "My Certificates": ScrollText,
        "Student Certificates": ScrollText,
        Documents: FolderOpen,
        "My Documents": FolderOpen,
        "Student Documents": FolderOpen,
        "Documents Upload": FolderOpen,

        // ── Staff submodules ───────────────────────────────────────────────────
        Enrollment: UserPlus,
        Designations: BadgeCheck,
        "Staff Attendance": ClipboardCheck,

        // ── Fee submodules ─────────────────────────────────────────────────────
        "Fee Categories": Tag,
        "Fee Types": Tags,
        "Fee Terms": CalendarRange,
        "Fee Mappings": GitBranch,
        Transactions: ArrowLeftRight,
        "Fee Transactions": ArrowLeftRight,
        "Fee Collections": Wallet,
        "Fee Collection": Wallet,
        Receipts: Receipt,
        "Fee Receipts": Receipt,
        "My Fees": IndianRupee,
        "My Receipts": Receipt,
        Refunds: RotateCcw,
        "Fee Refunds": RotateCcw,
        "Fee Reports": BarChart2,
        Reports: BarChart2,
        "Student Reports": BarChart2,
        "Student Report": BarChart2,
        "Staff Reports": BarChart2,
        "Staff Report": BarChart2,
        "Transport Reports": BarChart2,
        "Transport Report": BarChart2,
        "Academic Reports": BarChart2,
        "Academic Report": BarChart2,
        "Term Amounts": IndianRupee,
        "Fee Term Amounts": IndianRupee,

        // ── Expense submodules ─────────────────────────────────────────────────
        Overview: LayoutDashboard,
        Categories: Tag,
        Types: Tags,
        Departments: Building2,
        Approvals: CheckCircle2,
        Summary: LayoutList,
        Settings: Settings2,
        "Expense Settings": Settings2,
        "Audit Log": History,

        // ── Transport submodules ───────────────────────────────────────────────
        Routes: RouteIcon,
        "Route Stops": MapPin,
        Vehicles: Truck,
        Trips: Navigation,
        "Transport Trips": Navigation,
        "Student Transport": UserRound,
        "Student Trips": Navigation,

        // ── Exam submodules ────────────────────────────────────────────────────
        Exams: ClipboardList,
        "Exam List": ClipboardList,
        "Create Exam": PenLine,
        "Mark Entry": Pencil,
        "Mark Permissions": ShieldCheck,
        "Exam Dates": CalendarClock,
        Results: Trophy,
        "Student Results": Trophy,
        "Hall Tickets": Ticket,
        "Hall Ticket Download": Download,
        Grading: Layers,
        "Grading Setup": Layers,
        "Exam Grade Schemes": Table2,
        "Subject Grade Schemes": Table2,
        "Remark Grade Sets": ListChecks,
        "Board Patterns": LayoutTemplate,
        "Exam Settings": Settings2,
        Notifications: Bell,

        // ── Misc / legacy ──────────────────────────────────────────────────────
        Chat: MessageSquare,
        "File Manager": Folder,
        Ecommerce: ShoppingCart,
        Crypto: Bitcoin,
        Email: Mail,
        Invoices: Receipt,
        Projects: Folder,
    };

    return iconMap[name] || Folder;
};

// Normalize URL for comparison: lowercase, strip separators (-, _), remove trailing slash
const normalizeUrl = (url: string): string =>
    url.toLowerCase().replace(/[-_\s]/g, '').replace(/\/+$/, '');

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
    const location = useLocation();
    const isActive = item.url && normalizeUrl(location.pathname) === normalizeUrl(item.url);
    
    // Map module names to routes when they don't match the simple lowercase derivation
    const MODULE_ROUTE_MAP: Record<string, string> = {
        'report': '/reports',
        'reports': '/reports',
        'administration': '/admin',
        'feemanagement': '/fee',
        'staffmanagement': '/staff',
        'exammanagement': '/exam',
        'timetablemanagement': '/TimeTable',
    };

    // For top-level items, always derive the dashboard URL from the name
    // (backend may send a child page URL like /masters/routeStops instead of /masters)
    const getDerivedUrl = (): string | null => {
        if (level === 0) {
            const derivedName = item.name.toLowerCase().replace(/\s+/g, '');
            return MODULE_ROUTE_MAP[derivedName] || `/${derivedName}`;
        }
        return item.url;
    };

    const handleClick = () => {
        if (hasChildren) {
            onExpand(item.id);
            const targetUrl = getDerivedUrl();
            if (targetUrl) {
                navigate({ to: targetUrl });
                if (isMobile && onItemClick) onItemClick();
            }
        } else {
            const targetUrl = getDerivedUrl() || item.url;
            if (targetUrl) {
                navigate({ to: targetUrl });
                if (isMobile && onItemClick) onItemClick();
            }
        }
    };

    return (
        <div className="relative">
            <button
                className={clsx(
                    "flex items-center w-full gap-3 px-3 cursor-pointer py-2.5 rounded-lg transition-colors group text-left",
                    open ? "justify-start" : "justify-center",
                    level > 0 && "ml-4 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-sidebar",
                    isActive
                        ? "border-l-4 border-primary bg-primary/10 text-primary hover:bg-primary/20"
                        : "hover:bg-sidebar-accent"
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
                        "transition-all duration-200",
                        isActive ? "font-semibold" : "font-medium",
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
                    {item.children.map((child, index) => (
                        <li key={`${child.id}-${index}`}>
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
    console.log('Sidebar received menuData:', menuData);
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
    const location = useLocation();

    // Helper function to find if any child is active
    const hasActiveChild = (item: MenuItem): boolean => {
        if (item.url && normalizeUrl(location.pathname) === normalizeUrl(item.url)) {
            return true;
        }
        if (item.children) {
            return item.children.some(child => hasActiveChild(child));
        }
        return false;
    };

    // Auto-expand menus with active children on mount
    useEffect(() => {
        const menusToExpand = new Set<number>();

        const findActiveParents = (items: MenuItem[]) => {
            items.forEach(item => {
                if (item.children) {
                    if (hasActiveChild(item)) {
                        menusToExpand.add(item.id);
                        findActiveParents(item.children);
                    }
                }
            });
        };

        findActiveParents(menuData);
        if (menusToExpand.size > 0) {
            setExpandedMenus(menusToExpand);
        }
    }, [location.pathname, menuData]);

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
                    {menuData.map((item, index) => (
                        <li key={`${item.id}-${index}`}>
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
                                    key={`submenu-${id}-${level}`}
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
                                    key={`submenu-children-${id}-${level}`}
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
                                        {itemsToShow.map((child, childIndex) => (
                                            <li key={`submenu-${id}-${child.id}-${childIndex}`}>
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
                    }).filter(Boolean),
                    document.body
                )
            )}
        </aside>
    );
}