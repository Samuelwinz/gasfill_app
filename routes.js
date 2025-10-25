/**
 * GasFill App - Centralized Routing System
 * Handles role-based navigation for all user types
 */

// Route definitions for different user roles
const ROUTES = {
    // Public routes (no authentication required)
    public: {
        home: 'index.html',
        login: 'app.html#login',
        register: 'app.html#register',
        about: 'app.html#about'
    },
    
    // Customer routes
    customer: {
        dashboard: 'app.html',
        products: 'app.html#products', 
        services: 'app.html#services',
        serviceTracking: 'app.html#service-tracking',
        cart: 'app.html#cart',
        orders: 'app.html#orders',
        profile: 'app.html#profile'
    },
    
    // Rider routes
    rider: {
        dashboard: 'rider_dashboard.html',
        availableServices: 'rider_dashboard.html#available',
        myServices: 'rider_dashboard.html#active',
        earnings: 'rider_dashboard.html#earnings',
        history: 'rider_dashboard.html#history',
        profile: 'rider_dashboard.html#profile'
    },
    
    // Admin routes
    admin: {
        dashboard: 'admin_dashboard.html',
        users: 'admin_dashboard.html#users',
        services: 'admin_dashboard.html#services',
        orders: 'admin_dashboard.html#orders',
        riders: 'admin_dashboard.html#riders',
        earnings: 'admin_dashboard.html#earnings',
        analytics: 'admin_dashboard.html#analytics',
        settings: 'admin_dashboard.html#settings',
        // Admin can also access other interfaces
        customerView: 'app.html',
        riderView: 'rider_dashboard.html'
    }
};

// User role hierarchy and permissions
const ROLE_PERMISSIONS = {
    customer: ['customer', 'public'],
    rider: ['rider', 'public'],
    admin: ['admin', 'customer', 'rider', 'public']
};

// Default routes for each role
const DEFAULT_ROUTES = {
    customer: ROUTES.customer.dashboard,
    rider: ROUTES.rider.dashboard,
    admin: ROUTES.admin.dashboard
};

// Routing utility class
class AppRouter {
    constructor() {
        this.currentUser = null;
        this.currentRoute = null;
        this.init();
    }
    
    init() {
        // Load user from localStorage
        this.loadUser();
        
        // Handle initial routing
        this.handleInitialRoute();
        
        // Setup route change listeners
        this.setupRouteListeners();
    }
    
    loadUser() {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('currentUser');
        
        if (token && userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
            } catch (error) {
                console.error('Failed to parse user data:', error);
                this.logout();
            }
        }
    }
    
    handleInitialRoute() {
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || 'index.html';
        
        if (!this.currentUser) {
            // Not authenticated - redirect to login if trying to access protected routes
            if (this.isProtectedRoute(currentFile)) {
                this.redirectTo(ROUTES.public.login);
                return;
            }
        } else {
            // Authenticated - check if current route is appropriate for user role
            if (!this.hasAccessToRoute(currentFile, this.currentUser.role)) {
                this.redirectToDefaultRoute(this.currentUser.role);
                return;
            }
        }
        
        this.currentRoute = currentFile;
    }
    
    setupRouteListeners() {
        // Listen for authentication changes
        window.addEventListener('userLogin', (event) => {
            this.currentUser = event.detail.user;
            this.redirectToDefaultRoute(this.currentUser.role);
        });
        
        window.addEventListener('userLogout', () => {
            this.currentUser = null;
            this.redirectTo(ROUTES.public.login);
        });
        
        // Listen for hash changes for SPA navigation
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }
    
    isProtectedRoute(filename) {
        const protectedRoutes = [
            'app.html',
            'rider_dashboard.html', 
            'admin_dashboard.html'
        ];
        return protectedRoutes.includes(filename);
    }
    
    hasAccessToRoute(filename, userRole) {
        // Public routes accessible to all
        if (Object.values(ROUTES.public).some(route => route.includes(filename))) {
            return true;
        }
        
        // Check role-specific access
        const permissions = ROLE_PERMISSIONS[userRole] || [];
        
        // Check each permission level
        for (const permission of permissions) {
            const routes = ROUTES[permission];
            if (routes && Object.values(routes).some(route => route.includes(filename))) {
                return true;
            }
        }
        
        return false;
    }
    
    redirectToDefaultRoute(userRole) {
        const defaultRoute = DEFAULT_ROUTES[userRole];
        if (defaultRoute) {
            this.redirectTo(defaultRoute);
        } else {
            this.redirectTo(ROUTES.public.login);
        }
    }
    
    redirectTo(route) {
        if (route.includes('#')) {
            const [file, hash] = route.split('#');
            if (window.location.pathname.includes(file) || file === window.location.pathname.split('/').pop()) {
                window.location.hash = hash;
            } else {
                window.location.href = route;
            }
        } else {
            window.location.href = route;
        }
    }
    
    navigateTo(routeKey, roleContext = null) {
        if (!this.currentUser && roleContext !== 'public') {
            this.redirectTo(ROUTES.public.login);
            return;
        }
        
        const userRole = this.currentUser?.role || 'public';
        const targetRole = roleContext || userRole;
        
        // Check if user has permission to access target role routes
        if (!ROLE_PERMISSIONS[userRole]?.includes(targetRole)) {
            console.warn(`User ${userRole} does not have access to ${targetRole} routes`);
            return;
        }
        
        const route = ROUTES[targetRole]?.[routeKey];
        if (route) {
            this.redirectTo(route);
        } else {
            console.error(`Route not found: ${targetRole}.${routeKey}`);
        }
    }
    
    handleHashChange() {
        // Handle SPA navigation within the same file
        const hash = window.location.hash.substring(1);
        this.currentRoute = `${window.location.pathname.split('/').pop()}#${hash}`;
        
        // Emit custom event for components to handle route changes
        window.dispatchEvent(new CustomEvent('routeChange', {
            detail: { hash, fullRoute: this.currentRoute }
        }));
    }
    
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        window.dispatchEvent(new CustomEvent('userLogout'));
    }
    
    // Helper methods for components
    getCurrentUser() {
        return this.currentUser;
    }
    
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    hasRole(role) {
        return this.currentUser?.role === role;
    }
    
    hasPermission(permission) {
        const userRole = this.currentUser?.role;
        return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
    }
    
    // Route generation helpers
    getRouteForRole(routeKey, role) {
        return ROUTES[role]?.[routeKey];
    }
    
    getUserRoutes() {
        if (!this.currentUser) return ROUTES.public;
        
        const userRole = this.currentUser.role;
        const permissions = ROLE_PERMISSIONS[userRole] || [];
        
        const availableRoutes = {};
        permissions.forEach(permission => {
            if (ROUTES[permission]) {
                Object.assign(availableRoutes, ROUTES[permission]);
            }
        });
        
        return availableRoutes;
    }
}

// Initialize global router
window.AppRouter = new AppRouter();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppRouter, ROUTES, ROLE_PERMISSIONS };
}