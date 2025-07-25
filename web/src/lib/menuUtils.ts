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

export const useMenuData = () => {
    const { user } = useAuthStore();

    // This is a placeholder - replace with actual API call
    return useQuery({
        queryKey: ['menu'],
        queryFn: () => {
            // For now, return sample data
            // In a real implementation, this would be:
            // return fetch('/api/menu').then(res => res.json())
            const sampleMenuData: MenuItem[] = [
                {
                    "id": 1,
                    "name": "Dashboard",
                    "url": "/dashboard",
                    "level": "L0",
                    "children": []
                },
                {
                    "id": 2,
                    "name": "Masters",
                    "url": null,
                    "level": "L0",
                    "children": [
                        {
                            "id": 3,
                            "name": "Subjects",
                            "url": "/masters/subjects",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 4,
                            "name": "Classes & Sections",
                            "url": "/masters/classesandsections",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 5,
                            "name": "Academic Years",
                            "url": "/masters/academicyears",
                            "level": "L1",
                            "children": []
                        },

                        {
                            "id": 8,
                            "name": "Holidays",
                            "url": "/masters/holidays",
                            "level": "L1",
                            "children": []
                        },
                    ]
                },

                {
                    "id": 10,
                    "name": "Students",
                    "url": null,
                    "level": "L0",
                    "children": [
                        {
                            "id": 11,
                            "name": "Attendance",
                            "url": "/students/attendance",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 20,
                            "name": "Certificates Upload",
                            "url": "/students/certificatesupload",
                            "level": "L1",
                            "children": []
                        },
                    ]
                },
                {
                    "id": 12,
                    "name": "Staff",
                    "url": null,
                    "level": "L0",
                    "children": [
                        {
                            "id": 13,
                            "name": "Enrollment",
                            "url": "/staff/enrollment",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 14,
                            "name": "Attendance",
                            "url": "/staff/attendance",
                            "level": "L1",
                            "children": []
                        },
                    ]
                },

                {
                    "id": 21,
                    "name": "Transport",
                    "url": null,
                    "level": "L0",
                    "children": [
                        {
                            "id": 22,
                            "name": "Routes",
                            "url": "/transport/routes",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 23,
                            "name": "Route Stops",
                            "url": "/transport/routeStops",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 24,
                            "name": "Vehicles",
                            "url": "/transport/vehicles",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 25,
                            "name": "Trips",
                            "url": "/transport/trips",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 26,
                            "name": "Student Transport",
                            "url": "/transport/studentTransport",
                            "level": "L1",
                            "children": []
                        },
                        {
                            "id": 27,
                            "name": "Student Trips",
                            "url": "/transport/studentTrips",
                            "level": "L1",
                            "children": []
                        }
                    ]
                }

                // , {
                //     "id": 15,
                //     "name": "Calender",
                //     "url": "/Calender",
                //     "level": "L0",
                //     "children": []
                // }
                , {
                    "id": 15,
                    "name": "TimeTable",
                    "url": "/TimeTable",
                    "level": "L0",
                    "children": []
                },
                {
                    "id": 16,
                    "name": "Academics",
                    "url": null,
                    "level": "L0",
                    "children": [
                        {
                            "id": 17,
                            "name": "Curriculum",
                            "url": null,
                            "level": "L1",
                            "children": [
                                {
                                    "id": 18,
                                    "name": "Subjects",
                                    "url": "/academics/curriculum/subjects",
                                    "level": "L2",
                                    "children": []
                                },
                                {
                                    "id": 19,
                                    "name": "Syllabus",
                                    "url": "/academics/curriculum/syllabus",
                                    "level": "L2",
                                    "children": []
                                }
                            ]
                        }
                    ]
                }
            ];
            return sampleMenuData;
        },
        enabled: !!user
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