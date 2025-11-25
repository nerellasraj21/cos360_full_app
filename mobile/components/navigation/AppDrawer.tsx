import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    StatusBar,
    Animated,
    Easing,
    Platform,
    Vibration,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

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

// Icon mapping for different menu items
const getMenuIcon = (name: string, path: string): string => {
    const lowerName = name.toLowerCase();

    // Dashboard
    if (lowerName.includes('dashboard')) return 'house.fill';

    // Masters
    if (lowerName.includes('masters') || lowerName.includes('master')) return 'gear';
    if (lowerName.includes('academic') && lowerName.includes('year')) return 'calendar';
    if (lowerName.includes('class') && !lowerName.includes('mapping')) return 'building.2';
    if (lowerName.includes('section')) return 'rectangle.3.group';
    if (lowerName.includes('staff') && !lowerName.includes('attendance')) return 'person.2';
    if (lowerName.includes('staff') && lowerName.includes('attendance')) return 'clock';
    if (lowerName.includes('designation')) return 'person.badge.plus';
    if (lowerName.includes('subject') && !lowerName.includes('mapping') && !lowerName.includes('categor')) return 'book';
    if (lowerName.includes('subject') && lowerName.includes('categor')) return 'folder';
    if (lowerName.includes('mapping')) return 'link';
    if (lowerName.includes('holiday')) return 'sun.max';
    if (lowerName.includes('parent')) return 'person.2.circle';
    if (lowerName.includes('timetable')) return 'calendar.badge.clock';

    // Students
    if (lowerName.includes('student')) {
        if (lowerName.includes('admission')) return 'person.badge.plus';
        if (lowerName.includes('attendance')) return 'checkmark.circle';
        if (lowerName.includes('document')) return 'doc';
        if (lowerName.includes('certificate')) return 'rosette';
        if (lowerName.includes('transport')) return 'bus';
        return 'graduationcap';
    }

    // Fee Management
    if (lowerName.includes('fee')) {
        if (lowerName.includes('categor')) return 'folder';
        if (lowerName.includes('type')) return 'tag';
        if (lowerName.includes('term')) return 'calendar.badge.clock';
        if (lowerName.includes('mapping')) return 'link';
        if (lowerName.includes('amount')) return 'dollarsign.circle';
        if (lowerName.includes('collection') || lowerName.includes('transaction')) return 'creditcard';
        if (lowerName.includes('receipt')) return 'receipt';
        if (lowerName.includes('refund')) return 'arrow.uturn.backward.circle';
        return 'banknote';
    }

    // Transport
    if (lowerName.includes('transport') || lowerName.includes('route') || lowerName.includes('vehicle')) {
        if (lowerName.includes('route') && !lowerName.includes('stop')) return 'map';
        if (lowerName.includes('stop')) return 'mappin.circle';
        if (lowerName.includes('vehicle')) return 'car';
        if (lowerName.includes('trip')) return 'location.circle';
        return 'bus';
    }

    // Reports
    if (lowerName.includes('report')) return 'chart.bar';

    // Administration
    if (lowerName.includes('admin') || lowerName.includes('user') || lowerName.includes('role') || lowerName.includes('permission') || lowerName.includes('menu')) {
        if (lowerName.includes('user')) return 'person.circle';
        if (lowerName.includes('role')) return 'person.badge.shield.checkmark';
        if (lowerName.includes('permission')) return 'lock.shield';
        if (lowerName.includes('menu')) return 'list.bullet';
        return 'gearshape';
    }

    // Default icons
    return 'app';
};

const AppDrawer: React.FC<AppDrawerProps> = ({ visible, onClose, menuItems }) => {
    const { colors } = useTheme();
    const { user, role, logout } = useAuth();
    const [currentFolder, setCurrentFolder] = useState<MenuItem | null>(null);
    const [navigationStack, setNavigationStack] = useState<MenuItem[]>([]);
    const [pressedItem, setPressedItem] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const slideAnimation = useRef(new Animated.Value(0)).current;
    const folderAnimation = useRef(new Animated.Value(0)).current;

    // Animate drawer entrance
    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnimation, {
                toValue: 1,
                duration: 300,
                easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
                useNativeDriver: true,
            }).start();
        } else {
            slideAnimation.setValue(0);
            setCurrentFolder(null);
            setNavigationStack([]);
            setSearchQuery('');
        }
    }, [visible]);

    // Animate folder transitions
    useEffect(() => {
        Animated.timing(folderAnimation, {
            toValue: currentFolder ? 1 : 0,
            duration: 250,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            useNativeDriver: true,
        }).start();
    }, [currentFolder]);

    const openFolder = (folder: MenuItem) => {
        setNavigationStack(prev => [...prev, folder]);
        setCurrentFolder(folder);
    };

    const closeFolder = () => {
        const newStack = [...navigationStack];
        newStack.pop();
        setNavigationStack(newStack);
        setCurrentFolder(newStack[newStack.length - 1] || null);
    };

    const goToRoot = () => {
        setCurrentFolder(null);
        setNavigationStack([]);
    };

    const handleMenuItemPress = (item: MenuItem) => {
        // Haptic feedback
        if (Platform.OS === 'ios') {
            Vibration.vibrate(10);
        }

        if (item.children && item.children.length > 0) {
            // Open folder
            openFolder(item);
        } else {
            // Navigate to the item's path
            setPressedItem(item.id);
            setTimeout(() => {
                onClose();
                router.push(item.path as any);
            }, 150);
        }
    };

    const handlePressIn = (itemId: string) => {
        setPressedItem(itemId);
    };

    const handlePressOut = () => {
        setPressedItem(null);
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

    const renderAppIcon = (item: MenuItem) => {
        const hasChildren = item.children && item.children.length > 0;
        const icon = getMenuIcon(item.name, item.path);

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.appIcon,
                    {
                        backgroundColor: pressedItem === item.id ? colors.primary + '15' : 'transparent',
                    }
                ]}
                onPress={() => handleMenuItemPress(item)}
                onPressIn={() => handlePressIn(item.id)}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                {/* App Icon Container */}
                <Animated.View style={[
                    styles.appIconContainer,
                    {
                        backgroundColor: hasChildren ? colors.secondary : colors.primary,
                        transform: pressedItem === item.id ? [{ scale: 0.85 }] : [{ scale: 1 }],
                    }
                ]}>
                    {hasChildren ? (
                        // Folder icon with mini icons inside
                        <View style={styles.folderIcon}>
                            <View style={[styles.folderBackground, { backgroundColor: colors.secondary }]} />
                            <View style={styles.miniIconsContainer}>
                                {item.children!.slice(0, 4).map((child, index) => (
                                    <View
                                        key={child.id}
                                        style={[
                                            styles.miniIcon,
                                            { backgroundColor: colors.primary },
                                            index === 0 && styles.miniIconTopLeft,
                                            index === 1 && styles.miniIconTopRight,
                                            index === 2 && styles.miniIconBottomLeft,
                                            index === 3 && styles.miniIconBottomRight,
                                        ]}
                                    >
                                        <IconSymbol
                                            name={getMenuIcon(child.name, child.path)}
                                            size={8}
                                            color={colors['primary-foreground']}
                                        />
                                    </View>
                                ))}
                            </View>
                            {item.children!.length > 4 && (
                                <View style={[styles.moreIndicator, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.moreText, { color: colors['primary-foreground'] }]}>
                                        +{item.children!.length - 4}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        // Regular app icon
                        <IconSymbol
                            name={icon}
                            size={32}
                            color={colors['primary-foreground']}
                        />
                    )}
                </Animated.View>

                {/* App Name */}
                <Text
                    style={[
                        styles.appName,
                        { color: colors.foreground }
                    ]}
                    numberOfLines={2}
                >
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderGridView = (items: MenuItem[]) => {
        return (
            <View style={styles.gridContainer}>
                {items.map(item => renderAppIcon(item))}
            </View>
        );
    };

    // Filter and search logic
    const filterMenuItems = (items: MenuItem[], query: string): MenuItem[] => {
        if (!query.trim()) return items;

        const filtered: MenuItem[] = [];

        items.forEach(item => {
            const matchesName = item.name.toLowerCase().includes(query.toLowerCase());

            if (item.children && item.children.length > 0) {
                const matchingChildren = filterMenuItems(item.children, query);

                if (matchesName || matchingChildren.length > 0) {
                    // If searching, flatten the structure to show all matching items
                    if (matchesName) {
                        filtered.push(item);
                    }
                    // Add matching children as top-level items when searching
                    filtered.push(...matchingChildren);
                }
            } else if (matchesName) {
                filtered.push(item);
            }
        });

        return filtered;
    };

    const getCurrentItems = () => {
        if (currentFolder) {
            return currentFolder.children
                ? filterMenuItems(currentFolder.children.sort((a, b) => a.display_order - b.display_order), searchQuery)
                : [];
        }

        return menuItems && menuItems.length > 0
            ? filterMenuItems([...menuItems].sort((a, b) => a.display_order - b.display_order), searchQuery)
            : [];
    };

    const currentItems = getCurrentItems();

    const slideTransform = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    const fadeOpacity = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <Modal
            visible={visible}
            animationType="fade"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
            transparent={false}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

                <Animated.View
                    style={[
                        styles.drawerContent,
                        {
                            transform: [{ translateX: slideTransform }],
                            opacity: fadeOpacity,
                        }
                    ]}
                >

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.userAvatarText, { color: colors['primary-foreground'] }]}>
                                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </Text>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.userName, { color: colors.foreground }]}>
                                        {user?.username || 'User'}
                                    </Text>
                                    <Text style={[styles.userRole, { color: colors['muted-foreground'] }]}>
                                        {role?.name || 'Role'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <IconSymbol name="xmark" size={24} color={colors['muted-foreground']} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View style={[styles.searchContainer, { backgroundColor: colors.input }]}>
                            <IconSymbol name="magnifyingglass" size={18} color={colors['muted-foreground']} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.foreground }]}
                                placeholder="Search apps..."
                                placeholderTextColor={colors['muted-foreground']}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                clearButtonMode="while-editing"
                                returnKeyType="search"
                            />
                        </View>
                    </View>

                    {/* Navigation Bar */}
                    {currentFolder && (
                        <View style={[styles.navigationBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={closeFolder} style={styles.backButton}>
                                <IconSymbol name="chevron.left" size={20} color={colors.primary} />
                                <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
                            </TouchableOpacity>
                            <Text style={[styles.folderTitle, { color: colors.foreground }]} numberOfLines={1}>
                                {currentFolder.name}
                            </Text>
                            <TouchableOpacity onPress={goToRoot} style={styles.homeButton}>
                                <IconSymbol name="house.fill" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Content Area */}
                    <ScrollView
                        style={styles.menuContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.menuContent}
                    >
                        <Animated.View
                            style={[
                                styles.contentContainer,
                                {
                                    transform: [
                                        {
                                            translateX: folderAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, 0],
                                            })
                                        }
                                    ],
                                    opacity: folderAnimation.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: [1, 0.5, 1],
                                    })
                                }
                            ]}
                        >
                            {currentItems.length > 0 ? (
                                renderGridView(currentItems)
                            ) : (
                                <View style={styles.emptyState}>
                                    <IconSymbol
                                        name={searchQuery ? "magnifyingglass" : currentFolder ? "folder" : "app"}
                                        size={48}
                                        color={colors['muted-foreground']}
                                    />
                                    <Text style={[styles.emptyStateText, { color: colors['muted-foreground'] }]}>
                                        {searchQuery
                                            ? `No results found for "${searchQuery}"`
                                            : currentFolder
                                                ? "This folder is empty"
                                                : "No menu items available"
                                        }
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.logoutButton, { backgroundColor: colors.destructive }]}
                            onPress={handleLogout}
                        >
                            <IconSymbol name="arrow.right.square" size={20} color="white" />
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    drawerContent: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    userAvatarText: {
        fontSize: 22,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        opacity: 0.8,
    },
    closeButton: {
        padding: 12,
        borderRadius: 20,
    },
    navigationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingRight: 12,
    },
    backText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 4,
    },
    folderTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    homeButton: {
        padding: 8,
    },
    menuContainer: {
        flex: 1,
    },
    menuContent: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    contentContainer: {
        flex: 1,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    appIcon: {
        width: '25%',
        aspectRatio: 1,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        marginBottom: 8,
    },
    appIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    folderIcon: {
        width: '100%',
        height: '100%',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    folderBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 16,
        opacity: 0.9,
    },
    miniIconsContainer: {
        width: 40,
        height: 40,
        position: 'relative',
    },
    miniIcon: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniIconTopLeft: {
        top: 2,
        left: 2,
    },
    miniIconTopRight: {
        top: 2,
        right: 2,
    },
    miniIconBottomLeft: {
        bottom: 2,
        left: 2,
    },
    miniIconBottomRight: {
        bottom: 2,
        right: 2,
    },
    moreIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        fontSize: 8,
        fontWeight: '700',
    },
    appName: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 14,
        paddingHorizontal: 4,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderTopWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    logoutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateText: {
        fontSize: 18,
        marginTop: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        paddingVertical: 0,
    },
});

export default AppDrawer;