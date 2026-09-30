import { Ionicons } from '@expo/vector-icons';

/**
 * Shared menu mapping helpers.
 *
 * The backend serves the same menu tree to web and mobile, using the web app's
 * route paths. These helpers translate a web path into the equivalent
 * expo-router path and pick an icon/colour for a menu item name, mirroring the
 * web app's `getIconForMenuItem`. Used by both the drawer and the Masters hub
 * so the two always agree on where a menu entry leads.
 */

// Map web app paths → mobile expo-router paths
export const WEB_TO_MOBILE: Record<string, string> = {
    // Dashboard
    '/dashboard': '/(tabs)/',
    // Masters
    '/masters': '/(tabs)/masters',
    '/masters/academicyears': '/masters/academicyears',
    '/masters/classesandsections': '/masters/classesandsections',
    '/masters/subjectcategories': '/masters/subjectcategories',
    '/masters/subjects': '/masters/subjects',
    '/masters/classsubjectmappings': '/masters/classsubjectmappings',
    '/masters/holidays': '/masters/holidays',
    '/masters/parents': '/masters/parents',
    '/masters/locations': '/masters/locations',
    '/masters/staffmanagement': '/masters/staffmanagement',
    '/masters/rolespermissions': '/masters/rolespermissions',
    '/TimeTable': '/masters/timetable',
    '/masters/timetable': '/masters/timetable',
    // Masters → transport sections (web keeps these under /masters)
    '/masters/routes': '/transport/routes',
    '/masters/routeStops': '/transport/route-stops',
    '/masters/vehicles': '/transport/vehicles',
    // Students
    '/students': '/(tabs)/students',
    '/students/admission': '/students/admission',
    '/students/attendance': '/students/attendance',
    '/students/studentdocuments': '/students/studentdocuments',
    '/students/studentcertificates': '/students/studentcertificates',
    '/students/certificatetypes': '/students/certificatetypes',
    '/students/certificatetemplates': '/students/certificatetemplates',
    '/students/studenttransport': '/transport/student-transport',
    // Student/parent self-service views
    '/students/mycertificates': '/students/mycertificates',
    '/students/mydocuments': '/students/mydocuments',
    '/students/profile': '/students/profile',
    '/students/certificates': '/students/certificates',
    '/students/documents': '/students/documents',
    // Staff (appears in both Masters and Staff module)
    '/staff': '/(tabs)/staff',
    '/staff/attendance': '/staff/attendance',
    '/staff/designations': '/staff/designations',
    '/staff/profile': '/staff/profile',
    // Fees
    '/fees': '/(tabs)/fees',
    '/fee/categories': '/fees/categories',
    '/fee/types': '/fees/types',
    '/fee/terms': '/fees/terms',
    '/fee/mappings': '/fees/mappings',
    '/fee/term-amounts': '/fees/class-mappings',
    '/fee/collection': '/fees/collection',
    '/fee/receipts': '/fees/receipts',
    '/fee/refunds': '/fees/refunds',
    // Student/parent self-service fee views (web `/fee/my-fees`, `/fee/my-receipts`, `/fee/my-transactions`)
    '/fee/my-fees': '/fees/my-fees',
    '/fee/my-receipts': '/fees/my-receipts',
    '/fee/my-transactions': '/fees/my-transactions',
    // Transport
    '/transport': '/(tabs)/transport',
    '/transport/routes': '/transport/routes',
    '/transport/routeStops': '/transport/route-stops',
    '/transport/vehicles': '/transport/vehicles',
    '/masters/trips': '/transport/trips',
    '/transport/student-transport': '/transport/student-transport',
    '/transport/studentTransport': '/transport/student-transport',
    // Expense
    '/expense': '/(tabs)/expense',
    '/expense/categories': '/expense/categories',
    '/expense/departments': '/expense/departments',
    '/expense/types': '/expense/types',
    '/expense/transactions': '/expense/transactions',
    '/expense/approvals': '/expense/approvals',
    '/expense/reports': '/expense/reports',
    // Exam
    '/exam': '/(tabs)/exam',
    '/exam/exams': '/exam/list',
    '/exam/marks': '/exam/marks',
    '/exam/hall-tickets': '/exam/hall-tickets',
    '/exam/results': '/exam/results',
    // Reports
    '/reports': '/(tabs)/reports',
    '/reports/students': '/reports/student-reports',
    '/reports/student': '/reports/student-reports',
    '/reports/staff': '/reports/staff-reports',
    '/reports/transport': '/reports/transport-reports',
    '/reports/academic': '/reports/academic-reports',
    '/reports/fee': '/reports/fee-reports',
    '/reports/fees': '/reports/fee-reports',
    '/fee/reports': '/reports/fee-reports',
    // Administration
    '/admin': '/admin/users',
    '/admin/users': '/admin/users',
    '/admin/roles': '/masters/rolespermissions',
    '/admin/permissions': '/masters/rolespermissions',
    '/admin/menus': '/admin/menu',
    // Communication
    '/communication': '/(tabs)/communication',
};

export const mapPath = (webPath: string): string => {
    if (WEB_TO_MOBILE[webPath]) return WEB_TO_MOBILE[webPath];
    // Fallback: try prefix matching
    if (webPath.startsWith('/students')) return '/(tabs)/students';
    if (webPath.startsWith('/masters')) return '/(tabs)/masters';
    if (webPath.startsWith('/fee')) return '/(tabs)/fees';
    if (webPath.startsWith('/transport')) return '/(tabs)/transport';
    if (webPath.startsWith('/staff')) return '/(tabs)/staff';
    if (webPath.startsWith('/expense')) return '/(tabs)/expense';
    if (webPath.startsWith('/exam')) return '/(tabs)/exam';
    if (webPath.startsWith('/reports')) return '/(tabs)/reports';
    if (webPath.startsWith('/communication')) return '/(tabs)/communication';
    return '/(tabs)/';
};

// Map module name → { icon, color }
export const getModuleStyle = (name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
    const n = name.toLowerCase();

    if (n.includes('dashboard')) return { icon: 'home', color: '#556ee6' };

    if (n.includes('student')) {
        if (n.includes('admission')) return { icon: 'person-add', color: '#3B82F6' };
        if (n.includes('attendance')) return { icon: 'checkmark-circle', color: '#3B82F6' };
        if (n.includes('certificate')) return { icon: 'ribbon', color: '#3B82F6' };
        if (n.includes('document')) return { icon: 'document-text', color: '#3B82F6' };
        if (n.includes('transport')) return { icon: 'bus', color: '#3B82F6' };
        return { icon: 'people', color: '#3B82F6' };
    }

    if (n.includes('fee')) {
        if (n.includes('categor')) return { icon: 'folder', color: '#10B981' };
        if (n.includes('type')) return { icon: 'pricetag', color: '#10B981' };
        if (n.includes('term')) return { icon: 'calendar', color: '#10B981' };
        if (n.includes('mapping') || n.includes('class')) return { icon: 'link', color: '#10B981' };
        if (n.includes('transaction') || n.includes('collection')) return { icon: 'card', color: '#10B981' };
        if (n.includes('refund')) return { icon: 'refresh-circle', color: '#10B981' };
        return { icon: 'cash', color: '#10B981' };
    }

    if (n.includes('master')) return { icon: 'grid', color: '#06B6D4' };
    if (n.includes('academic') && n.includes('year')) return { icon: 'calendar', color: '#06B6D4' };
    if (n.includes('class') || n.includes('section')) return { icon: 'business', color: '#06B6D4' };
    if (n.includes('subject') && n.includes('categor')) return { icon: 'folder', color: '#06B6D4' };
    if (n.includes('subject')) return { icon: 'book', color: '#06B6D4' };
    if (n.includes('timetable')) return { icon: 'time', color: '#06B6D4' };
    if (n.includes('holiday')) return { icon: 'sunny', color: '#06B6D4' };
    if (n.includes('role') || n.includes('permission')) return { icon: 'shield-checkmark', color: '#06B6D4' };

    if (n.includes('transport') || n.includes('route') || n.includes('vehicle')) {
        if (n.includes('route') && !n.includes('stop')) return { icon: 'map', color: '#F59E0B' };
        if (n.includes('stop')) return { icon: 'location', color: '#F59E0B' };
        if (n.includes('vehicle')) return { icon: 'car', color: '#F59E0B' };
        if (n.includes('trip')) return { icon: 'navigate', color: '#F59E0B' };
        return { icon: 'bus', color: '#F59E0B' };
    }

    if (n.includes('staff')) {
        if (n.includes('attendance')) return { icon: 'calendar', color: '#8B5CF6' };
        if (n.includes('designation')) return { icon: 'ribbon', color: '#8B5CF6' };
        if (n.includes('profile')) return { icon: 'person-circle', color: '#8B5CF6' };
        return { icon: 'people', color: '#8B5CF6' };
    }

    if (n.includes('expense')) {
        if (n.includes('categor')) return { icon: 'folder', color: '#F97316' };
        if (n.includes('type')) return { icon: 'pricetag', color: '#F97316' };
        if (n.includes('approval')) return { icon: 'checkmark-done', color: '#F97316' };
        return { icon: 'wallet', color: '#F97316' };
    }

    if (n.includes('exam')) {
        if (n.includes('mark')) return { icon: 'create', color: '#EF4444' };
        if (n.includes('result')) return { icon: 'bar-chart', color: '#EF4444' };
        if (n.includes('hall') || n.includes('ticket')) return { icon: 'document-text', color: '#EF4444' };
        if (n.includes('management')) return { icon: 'school', color: '#EF4444' };
        return { icon: 'school', color: '#EF4444' };
    }

    if (n.includes('report')) return { icon: 'stats-chart', color: '#6B7280' };
    if (n.includes('communication')) return { icon: 'chatbubbles', color: '#6B7280' };
    if (n.includes('administration') || n.includes('admin')) return { icon: 'shield', color: '#6B7280' };
    if (n.includes('profile')) return { icon: 'person-circle', color: '#556ee6' };
    if (n.includes('setting')) return { icon: 'settings', color: '#6B7280' };

    return { icon: 'apps', color: '#6B7280' };
};
