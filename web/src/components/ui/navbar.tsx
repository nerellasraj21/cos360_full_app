import { Button } from "./button";
import { Input } from "./input";
import { Menu, Search, Bell, User, ChevronDown, Sun, Moon, LogOut, X, Fullscreen, Calendar } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { useThemeStore } from "../../lib/themeStore";
import { useLogoutMutation } from "@/api/auth";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import AcademicYearDropdown from '@/components/common/AcademicYearDropdown';

export function Navbar({
    sidebarOpen,
    onSidebarToggle,
    isMobile
}: {
    sidebarOpen: boolean;
    isMobile: boolean;
    onSidebarToggle: () => void;
}) {
    const { theme, toggleTheme } = useThemeStore();
    const logoutMutation = useLogoutMutation();
    const navigate = useNavigate();
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };


    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    return (
        <>
            <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-background text-foreground border-b shadow-sm">

                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 ">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSidebarToggle}
                        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                        className={clsx("cursor-pointer transition-transform shrink-0", sidebarOpen ? "rotate-0" : "-rotate-180")}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>


                    <div className="hidden lg:flex items-center relative flex-1 max-w-md">
                        <Input
                            placeholder="Search..."
                            className="border-0 bg-muted/50 focus:ring-0 focus:bg-muted pl-8 h-9 w-full"
                        />
                        <Search className="w-4 h-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>


                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                        className="lg:hidden shrink-0"
                        aria-label="Toggle search"
                    >
                        {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </Button>

                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button variant="ghost" className="hidden md:flex items-center gap-1 shrink-0 cursor-pointer">
                                <span className="hidden lg:inline">Mega Menu</span>
                                <span className="lg:hidden">Menu</span>
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="bg-background border border-border rounded-md shadow-lg p-4 min-w-[200px] text-foreground">
                            <DropdownMenu.Item className="py-2 px-3 hover:bg-muted rounded cursor-pointer">
                                Dashboard
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="py-2 px-3 hover:bg-muted rounded cursor-pointer">
                                Projects
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="py-2 px-3 hover:bg-muted rounded cursor-pointer">
                                Settings
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Academic Year Display */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded-full border border-border min-w-[120px] max-w-[180px] w-full">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">Year</span>
                        <div className="w-[110px] text-[13px]">
                            <AcademicYearDropdown />
                        </div>
                    </div>
                    {/* Fullscreen Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFullscreenToggle}
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        className="cursor-pointer shrink-0"
                    >
                        <Fullscreen className="w-5 h-5" />
                    </Button>
                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        className="cursor-pointer shrink-0"
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </Button>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative shrink-0 cursor-pointer">
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-medium">
                            3
                        </span>
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3 rounded-full cursor-pointer">
                                <img
                                    src="https://randomuser.me/api/portraits/women/44.jpg"
                                    alt="User avatar"
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                                <span className="font-medium hidden sm:inline text-sm">admin</span>
                                <ChevronDown className="w-4 h-4 hidden sm:inline" />
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="bg-background border border-border rounded-md shadow-lg p-2 min-w-[150px] text-foreground">
                            <div className="px-3 py-2 border-b border-border mb-2">
                                <p className="font-medium text-sm">admin</p>
                                <p className="text-xs text-muted-foreground">admin@example.com</p>
                            </div>
                            <DropdownMenu.Item className="flex items-center gap-2 py-2 px-3 hover:bg-muted rounded cursor-pointer">
                                <User className="w-4 h-4" /> Profile
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="my-1 bg-border h-px" />
                            <DropdownMenu.Item
                                className="flex items-center gap-2 py-2 px-3 hover:bg-muted rounded cursor-pointer text-red-600 hover:text-red-700"
                                onClick={() => {
                                    logoutMutation.mutate(undefined, {
                                        onSuccess: () => navigate({ to: "/login" }),
                                    });
                                }}
                            >
                                <LogOut className="w-4 h- cursor-pointer" /> Logout
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>

            </nav>

            {/* Mobile Search Bar */}
            {mobileSearchOpen && (
                <div className="lg:hidden border-b bg-background px-4 py-3">
                    <div className="relative">
                        <Input
                            placeholder="Search..."
                            className="border bg-muted/50 focus:ring-2 focus:ring-ring pl-8 h-9 w-full"
                            autoFocus
                        />
                        <Search className="w-4 h-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            )}

        </>
    );
}