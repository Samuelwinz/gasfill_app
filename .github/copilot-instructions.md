````instructions# GasFill App - AI Coding Instructions

# GasFill App - AI Coding Instructions

## Project Overview

## Project OverviewGasFill is a single-page application (SPA) for LPG cylinder delivery service in Ghana. The app uses vanilla JavaScript with localStorage for data persistence - no frameworks, no backend. Two main HTML files serve different purposes:

GasFill is a multi-tiered LPG cylinder delivery platform with **hybrid architecture**:

- **Frontend**: Two distinct vanilla JS SPAs (`g8.html` for app, `gasfill_verion3.html` for marketing)- `gasfill_verion3.html` - Marketing/landing page with order form and company info

- **Backend**: Three server implementations (Python FastAPI, Node.js Express, Mock server)- `g8.html` - Full SPA with product catalog, cart, dashboard, and order management

- **Data**: SQLite for persistence, localStorage for client-side caching- `sw.js` - Service worker for offline support and caching

- **Real-time**: Socket.IO for live order tracking and rider coordination

## Architecture Patterns

## Architecture Patterns

### Client-Only Data Flow

### Hybrid Data StrategyAll data is stored in browser localStorage with these key patterns:

```javascript```javascript

// Client-side (localStorage): 'gasfill_orders_v1', 'gasfill_cart_v1'// Orders: 'gasfill_orders_v1' - array of order objects with id, status, createdAt

// Server-side persistence: SQLite via db.py module// Cart: 'gasfill_cart_v1' - array of cart items with id, name, price, qty

// Real-time sync: Socket.IO events for order status updates```

```

### SPA Navigation System

### Multi-Server ArchitectureUses custom vanilla JS routing without hash or history API:

1. **`python_server.py`** - Primary FastAPI server with full CRUD, auth, rider system- Sections controlled by `.active` class toggle

2. **`backend/src/server.js`** - Node.js server with MongoDB and real-time features  - Nav links use `data-target` attribute to specify section

3. **`mock-server.js`** - Lightweight Express server for frontend testing- `activateSection(id)` function handles all navigation



### Order State Machine### Mobile-First Responsive Design

Critical status flow enforced by backend validation:- CSS Grid with `grid-template-columns: repeat(3,1fr)` that collapses to 2/1 columns

```python- Hamburger menu at 768px breakpoint with `mobile-open` class toggle

ORDER_STATUS_FLOW = {- All interactive elements have minimum 44px touch targets

    "pending": ["assigned"],

    "assigned": ["pickup", "picked_up", "pending"], ## Development Workflows

    "pickup": ["in_transit", "assigned"],

    "in_transit": ["delivered", "pickup"],### Local Development

    "delivered": [], "cancelled": []```bash

}# Serve files locally (no build process needed)

```npx serve . -p 3000

# Or use any static file server - Python, Live Server, etc.

### SPA Navigation System  ```

Custom vanilla JS routing without frameworks:

- Sections controlled by `.active` class toggle### Testing Order Flow

- `activateSection(id)` for navigation1. Add items to cart via product cards

- No build process - direct file serving2. Check cart modal functionality 

3. Test localStorage persistence across page reloads

## Development Workflows4. Verify WhatsApp integration opens correct URL format



### Server Setup & Testing### Service Worker Updates

```bashWhen modifying cached resources, update `CACHE_NAME` in `sw.js`:

# Python FastAPI server (primary)```javascript

pip install -r requirements.txtconst CACHE_NAME = 'gasfill-v2'; // increment version

python python_server.py  # Port 8000```



# Node.js backend (alternative)## Code Conventions

cd backend && npm install && npm run dev  # Port 5000

### CSS Custom Properties

# Mock server (frontend testing)Uses CSS variables in `:root` for theming:

npm install && npm start  # Port 5000- `--accent1`: Teal - primary brand color

```- `--accent2`: Blue - secondary brand color  

- `--card`: White - card backgrounds

### Database Management- `--muted`: Gray - secondary text

```python

# SQLite operations via db.py### JavaScript Patterns

init_db()  # Creates orders table- Pure functions for data operations (`loadCart()`, `saveCart()`)

create_order(order_dict)  # Inserts/updates order- Event delegation on form submissions

get_order_by_id(order_id)  # Retrieves single order- Utility functions exposed to global scope for HTML onclick handlers

update_order_status(order_id, status, tracking_info)- Debounced functions for performance (`debounce()` wrapper)

```

### Form Handling

### Testing Multi-User FlowsAll forms use `event.preventDefault()` and custom submission handlers. No native form submission - everything goes to localStorage or opens WhatsApp.

1. **Customer Journey**: Order placement → tracking → delivery confirmation

2. **Rider Workflow**: Accept order → update status → complete delivery  ### SVG Illustrations

3. **Admin Dashboard**: Monitor all orders, assign riders, view statisticsInline SVG for product icons and illustrations - no external image dependencies. Follow the pattern of simple geometric shapes with brand colors.

4. **Real-time Updates**: Use browser dev tools to monitor Socket.IO events

## Integration Points

## Code Conventions

### WhatsApp Business Integration

### API Response PatternsOrders can be sent via WhatsApp with formatted message:

```python```javascript

# Standard success responseconst msg = `GasFill Order:%0AName:${name}%0APhone:${phone}%0A...`;

{"success": True, "message": "...", "data": {...}}window.open(`https://wa.me/233201022153?text=${msg}`);

```

# Error handling

raise HTTPException(status_code=400, detail="Validation error")### Phone Number Handling

Ghana format: +233 prefix, business number is hardcoded in `BUSINESS_PHONE` constant.

# Status updates with tracking

{"order_id": "ORD-123", "status": "in_transit", "tracking_info": {...}}### Service Worker Caching

```- Caches main HTML files for offline support

- Uses Cache-First strategy with network fallback

### Authentication Strategy- Automatically caches successful responses

- **JWT tokens** for API authentication

- **Role-based access**: `user`, `admin`, `rider`## Common Tasks

- **Rider-specific endpoints**: `/api/rider/*` with role validation

- **Admin endpoints**: `/api/admin/*` with admin key requirement### Adding New Products

1. Add product card to `.grid` in products section of `g8.html`

### Real-time Integration2. Include SVG illustration following existing pattern

```javascript3. Add `onclick="addToCart('id','name',price)"` to button

// Socket.IO client pattern4. Update price mapping in single order form if needed

const socket = io('http://localhost:8000');

socket.emit('orderStatusUpdate', {orderId, status});### Modifying Order Status Flow

socket.on('orderUpdate', (data) => updateUI(data));Orders have status progression: `pending` → `accepted` → `delivered`

```- Auto-rotation happens every 25 seconds via `updateOrderStatuses()`

- Manual status updates via dashboard buttons

## Integration Points

### Styling Updates

### Multi-Backend Communication- Maintain mobile-first responsive breakpoints (1000px, 768px, 640px)

- **Python FastAPI**: Primary API with SQLite, full feature set- Use existing CSS custom properties for consistency

- **Node.js**: MongoDB integration, alternative implementation- Follow card-based layout pattern with consistent border-radius (10-14px)

- **Frontend**: Adapts to available backend via endpoint detection

## Key Files Context

### WhatsApp Business Integration- Both HTML files are complete, standalone applications

Format maintained across all implementations:- No external dependencies except Google Fonts (Inter)

```javascript- localStorage keys are versioned (`_v1`) for future migration support

const msg = `GasFill Order:%0AName:${name}%0APhone:${phone}%0A...`;- All contact info and pricing is hardcoded for Ghana market (₵ currency)
window.open(`https://wa.me/233201022153?text=${msg}`);
```

### Payment Processing
Paystack integration in Python server:
```python
PAYSTACK_SECRET_KEY = "sk_test_..."  
PAYSTACK_PUBLIC_KEY = "pk_test_..."
# Webhook verification for payment confirmation
```

## Service-Specific Patterns

### Rider Management System
- **Registration**: `/api/auth/rider-register` with vehicle details
- **Status Updates**: `available`, `busy`, `offline` with location tracking
- **Earnings System**: Commission structure with daily/weekly bonuses
- **Service Workflow**: `pickup` → `refill` → `delivery` with granular status tracking

### Order Tracking Implementation
```python
# Backend validation of status transitions
def validate_status_transition(current: str, new: str) -> bool:
    return new in ORDER_STATUS_FLOW.get(current, [])

# Detailed tracking info structure
tracking_info = {
    "rider_id": int, "rider_name": str,
    "status_history": [{"status": str, "timestamp": str, "note": str}],
    "current_location": str, "notes": []
}
```

## Common Tasks

### Adding New Order Status
1. Update `ORDER_STATUS_FLOW` in `python_server.py`
2. Add status handling in `update_delivery_status()` endpoint
3. Update frontend status display in `g8.html` dashboard
4. Test status transition validation

### Extending Rider Features
1. Add new fields to `RiderRegister` model
2. Update rider dashboard API response
3. Modify rider dashboard UI rendering
4. Consider earnings impact for commission calculations

### Database Schema Changes
1. Modify SQLite schema in `db.py` `init_db()`
2. Add migration logic for existing data
3. Update Python models in `python_server.py`
4. Test data consistency across server restarts

## Key Files Context
- **`python_server.py`**: 2790 lines - primary backend with full feature set
- **`g8.html`**: Complete SPA with cart, dashboard, order management
- **`db.py`**: SQLite abstraction layer with JSON field handling
- **`mock-server.js`**: Simplified API for frontend development
- **Admin dashboards**: `admin.html`, `rider.html` for role-specific UIs
````