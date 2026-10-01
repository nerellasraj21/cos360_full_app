import { Button } from "./button";
import { Input } from "./input";
import { Menu, Search, User, ChevronDown, Sun, Moon, LogOut, Fullscreen, Calendar } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { useThemeStore } from "../../lib/themeStore";
import { useLogoutMutation } from "@/api/auth";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import AcademicYearDropdown from '@/components/common/AcademicYearDropdown';
import { StudentSelector } from '@/components/common/StudentSelector';
import { useAuthStore } from '@/lib/authStore';
import { useIsParent } from '@/hooks/useStudentContext';

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
    const { user } = useAuthStore();

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
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Student Selector - Only show for parents */}
                    <StudentSelectorWrapper />
                    
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

                    {/* User Menu */}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3 rounded-full cursor-pointer">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold uppercase">
                                    {(user?.username || 'U').charAt(0)}
                                </div>
                                <span className="font-medium hidden sm:inline text-sm">{user?.username || 'User'}</span>
                                <ChevronDown className="w-4 h-4 hidden sm:inline" />
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="bg-background border border-border rounded-md shadow-lg p-2 min-w-[150px] text-foreground">
                            <div className="px-3 py-2 border-b border-border mb-2">
                                <p className="font-medium text-sm">{user?.username || 'User'}</p>
                                <p className="text-xs text-muted-foreground">{!!user?.email && user.email}</p>
                            </div>
                            <DropdownMenu.Item
                                className="flex items-center gap-2 py-2 px-3 hover:bg-muted rounded cursor-pointer"
                                onClick={() => navigate({ to: "/profile" })}
                            >
                                <User className="w-4 h-4" /> Profile
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="my-1 bg-border h-px" />
                            <DropdownMenu.Item
                                className="flex items-center gap-2 py-2 px-3 hover:bg-muted rounded cursor-pointer text-destructive hover:text-destructive/80"
                                onClick={() => {
                                    logoutMutation.mutate(undefined, {
                                        onSuccess: () => navigate({ to: "/login" }),
                                    });
                                }}
                            >
                                <LogOut className="w-4 h-4" /> Logout
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

// Student Selector Wrapper Component
function StudentSelectorWrapper() {
    const isParent = useIsParent();
    const { selectedStudent, availableStudents, selectStudent } = useAuthStore();

    if (!isParent || availableStudents.length === 0) {
        return null;
    }

    return (
        <div className="hidden md:block">
            <StudentSelector
                students={availableStudents}
                selectedStudent={selectedStudent}
                onStudentChange={selectStudent}
                className="w-[280px]"
            />
        </div>
    );
}