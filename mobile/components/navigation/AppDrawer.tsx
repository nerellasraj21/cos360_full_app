import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.82, 310);

interface MenuItem {
    id: string;
    name: string;
    path: string;
    display_order: number;
    children?: MenuItem[] | null;
}

interface AppDrawerProps {
    visible: boolean;
    onClose: () => void;
    menuItems: MenuItem[];
}

// Map web app paths → mobile expo-router paths
const WEB_TO_MOBILE: Record<string, string> = {
    // Dashboard
    '/dashboard': '/(tabs)/',
    // Masters
    '/masters/routeStops': '/(tabs)/masters',
    '/masters/academicyears': '/masters/academicyears',
    '/masters/classesandsections': '/masters/classesandsections',
    '/masters/subjectcategories': '/masters/subjectcategories',
    '/masters/subjects': '/masters/subjects',
    '/masters/classsubjectmappings': '/masters/classsubjectmappings',
    '/masters/holidays': '/masters/holidays',
    '/TimeTable': '/masters/timetable',
    // Students
    '/students': '/(tabs)/students',
    '/students/admission': '/students/admission',
    '/students/attendance': '/students/attendance',
    '/students/studentdocuments': '/students/studentdocuments',
    '/students/studentcertificates': '/students/studentcertificates',
    '/students/certificatetypes': '/students/certificatetypes',
    '/students/studenttransport': '/transport/student-transport',
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
    '/fee/mappings': '/fees/class-mappings',
    '/fee/term-amounts': '/fees/term-amounts',
    '/fee/collection': '/fees/collection',
    '/fee/receipts': '/fees/receipts',
    '/fee/refunds': '/fees/refunds',
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
    '/reports/students': '/reports/staff-reports',
    '/reports/staff': '/reports/staff-reports',
    '/reports/transport': '/reports/transport-reports',
    '/reports/academic': '/(tabs)/reports',
    '/fee/reports': '/(tabs)/fees',
    // Administration
    '/admin': '/admin/users',
    '/admin/users': '/admin/users',
    '/admin/roles': '/masters/rolespermissions',
    '/admin/permissions': '/masters/rolespermissions',
    '/admin/menus': '/admin/menu',
    // Communication
    '/communication': '/(tabs)/communication',
};

const mapPath = (webPath: string): string => {
    if (WEB_TO_MOBILE[webPath]) return WEB_TO_MOBILE[webPath];
    // Fallback: try prefix matching
    if (webPath.startsWith('/students')) return '/(tabs)/students';
    if (webPath.startsWith('/masters')) return '/(tabs)/masters';
    if (webPath.startsWith('/fee')) return '/(tabs)/fees';
    if (webPath.startsWith('/transport')) return '/(tabs)/transport';
    if (webPath.startsWith('/staff')) return '/(tabs)/staff';
    if (webPath.startsWith('/expense')) return '/(tabs)/expense';
    if (webPath.startsWith('/exam')) return '/(tabs)/exam';
    return '/(tabs)/';
};

// Map module name → { icon, color }
const getModuleStyle = (name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
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

const AppDrawer: React.FC<AppDrawerProps> = ({ visible, onClose, menuItems }) => {
    const { user, role, logout } = useAuth();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const roleName = role?.name?.toLowerCase() ?? '';
    const isStudentOrParent = ['student', 'parent', 'guardian', 'father', 'mother'].includes(roleName);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 260,
                    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 260,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 220,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start(() => setExpandedIds(new Set()));
        }
    }, [visible]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleLeafPress = (path: string) => {
        onClose();
        setTimeout(() => router.push(mapPath(path) as any), 150);
    };

    const handleLogout = async () => {
        try {
            await logout();
            onClose();
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const transportItem: MenuItem = {
        id: '__my_transport',
        name: 'My Transport',
        path: '/transport/student-transport',
        display_order: 999,
        children: null,
    };

    const sortedItems = [
        ...(menuItems ?? []).sort((a, b) => a.display_order - b.display_order),
        ...(isStudentOrParent ? [transportItem] : []),
    ];
    const initial = (user?.username || 'U').charAt(0).toUpperCase();

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                {/* Sidebar panel */}
                <Animated.View
                    style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
                >
                    <SafeAreaView style={styles.sidebarInner} edges={['top', 'bottom']}>
                        {/* ── Brand header ── */}
                        <View style={styles.brandHeader}>
                            <View style={styles.brandLogoRow}>
                                <View style={styles.brandIconBox}>
                                    <Ionicons name="school" size={18} color="white" />
                                </View>
                                <Text style={styles.brandTitle}>COS360</Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.brandClose}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>

                        {/* ── User strip ── */}
                        <View style={styles.userStrip}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>{initial}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.userName} numberOfLines={1}>{user?.username || 'User'}</Text>
                                <Text style={styles.userRole} numberOfLines={1}>{role?.name || 'User'}</Text>
                            </View>
                        </View>

                        {/* ── MENU label ── */}
                        <Text style={styles.sectionLabel}>MENU</Text>

                        {/* ── Menu items ── */}
                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.menuList}
                        >
                            {sortedItems.map(item => {
                                const hasChildren = (item.children?.length ?? 0) > 0;
                                const isExpanded = expandedIds.has(item.id);
                                const { icon, color } = getModuleStyle(item.name);

                                return (
                                    <View key={item.id}>
                                        {/* Parent row */}
                                        <TouchableOpacity
                                            style={[
                                                styles.menuRow,
                                                isExpanded && styles.menuRowExpanded,
                                            ]}
                                            onPress={() => {
                                                if (hasChildren) {
                                                    toggleExpand(item.id);
                                                } else {
                                                    handleLeafPress(item.path);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.menuIcon, { backgroundColor: color + '22' }]}>
                                                <Ionicons name={icon} size={17} color={color} />
                                            </View>
                                            <Text
                                                style={[
                                                    styles.menuLabel,
                                                    isExpanded && styles.menuLabelExpanded,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.name}
                                            </Text>
                                            {hasChildren && (
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                                                    size={15}
                                                    color={isExpanded ? '#fff' : 'rgba(255,255,255,0.3)'}
                                                />
                                            )}
                                        </TouchableOpacity>

                                        {/* Children (accordion) */}
                                        {hasChildren && isExpanded && (
                                            <View style={styles.childList}>
                                                {[...(item.children ?? [])]
                                                    .sort((a, b) => a.display_order - b.display_order)
                                                    .map(child => {
                                                        const c = getModuleStyle(child.name);
                                                        return (
                                                            <TouchableOpacity
                                                                key={child.id}
                                                                style={styles.childRow}
                                                                onPress={() => handleLeafPress(child.path)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={styles.childDotWrap}>
                                                                    <View style={[styles.childDot, { backgroundColor: c.color }]} />
                                                                </View>
                                                                <Ionicons name={c.icon} size={14} color={c.color} style={{ marginRight: 8 }} />
                                                                <Text style={styles.childLabel} numberOfLines={1}>
                                                                    {child.name}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {/* ── Footer / logout ── */}
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.8}>
                                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                                <Text style={styles.logoutText}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
};

export default AppDrawer;

const SIDEBAR_BG = '#1a1f37';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.07)';
const TEXT_PRIMARY = '#e2e8f0';
const TEXT_MUTED = 'rgba(255,255,255,0.4)';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sidebar: {
        width: DRAWER_WIDTH,
        height: '100%',
        backgroundColor: SIDEBAR_BG,
        shadowColor: '#000',
        shadowOffset: { width: 6, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 24,
    },
    sidebarInner: {
        flex: 1,
    },
    // Brand
    brandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: SIDEBAR_BORDER,
    },
    brandLogoRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#556ee6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    brandClose: {
        padding: 4,
    },
    // User strip
    userStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SIDEBAR_BORDER,
        gap: 12,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#556ee6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    userName: {
        color: TEXT_PRIMARY,
        fontSize: 14,
        fontWeight: '600',
    },
    userRole: {
        color: TEXT_MUTED,
        fontSize: 11,
        marginTop: 1,
    },
    // Section label
    sectionLabel: {
        color: TEXT_MUTED,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.4,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 6,
    },
    // Menu
    menuList: {
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: 10,
        gap: 12,
        marginBottom: 2,
    },
    menuRowExpanded: {
        backgroundColor: '#556ee6',
    },
    menuIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        flex: 1,
        color: TEXT_PRIMARY,
        fontSize: 14,
        fontWeight: '500',
    },
    menuLabelExpanded: {
        color: '#fff',
        fontWeight: '700',
    },
    // Children
    childList: {
        marginLeft: 20,
        marginBottom: 6,
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.08)',
    },
    childRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingRight: 8,
    },
    childDotWrap: {
        width: 16,
        alignItems: 'center',
        marginRight: 4,
    },
    childDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    childLabel: {
        flex: 1,
        color: 'rgba(255,255,255,0.55)',
        fontSize: 13,
        fontWeight: '400',
    },
    // Footer
    footer: {
        borderTopWidth: 1,
        borderTopColor: SIDEBAR_BORDER,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },
});
