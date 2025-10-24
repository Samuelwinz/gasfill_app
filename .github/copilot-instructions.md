# GasFill App - AI Coding Instructions

## Project Overview
GasFill is a single-page application (SPA) for LPG cylinder delivery service in Ghana. The app uses vanilla JavaScript with localStorage for data persistence - no frameworks, no backend. Two main HTML files serve different purposes:

- `gasfill_verion3.html` - Marketing/landing page with order form and company info
- `g8.html` - Full SPA with product catalog, cart, dashboard, and order management
- `sw.js` - Service worker for offline support and caching

## Architecture Patterns

### Client-Only Data Flow
All data is stored in browser localStorage with these key patterns:
```javascript
// Orders: 'gasfill_orders_v1' - array of order objects with id, status, createdAt
// Cart: 'gasfill_cart_v1' - array of cart items with id, name, price, qty
```

### SPA Navigation System
Uses custom vanilla JS routing without hash or history API:
- Sections controlled by `.active` class toggle
- Nav links use `data-target` attribute to specify section
- `activateSection(id)` function handles all navigation

### Mobile-First Responsive Design
- CSS Grid with `grid-template-columns: repeat(3,1fr)` that collapses to 2/1 columns
- Hamburger menu at 768px breakpoint with `mobile-open` class toggle
- All interactive elements have minimum 44px touch targets

## Development Workflows

### Local Development
```bash
# Serve files locally (no build process needed)
npx serve . -p 3000
# Or use any static file server - Python, Live Server, etc.
```

### Testing Order Flow
1. Add items to cart via product cards
2. Check cart modal functionality 
3. Test localStorage persistence across page reloads
4. Verify WhatsApp integration opens correct URL format

### Service Worker Updates
When modifying cached resources, update `CACHE_NAME` in `sw.js`:
```javascript
const CACHE_NAME = 'gasfill-v2'; // increment version
```

## Code Conventions

### CSS Custom Properties
Uses CSS variables in `:root` for theming:
- `--accent1`: Teal - primary brand color
- `--accent2`: Blue - secondary brand color  
- `--card`: White - card backgrounds
- `--muted`: Gray - secondary text

### JavaScript Patterns
- Pure functions for data operations (`loadCart()`, `saveCart()`)
- Event delegation on form submissions
- Utility functions exposed to global scope for HTML onclick handlers
- Debounced functions for performance (`debounce()` wrapper)

### Form Handling
All forms use `event.preventDefault()` and custom submission handlers. No native form submission - everything goes to localStorage or opens WhatsApp.

### SVG Illustrations
Inline SVG for product icons and illustrations - no external image dependencies. Follow the pattern of simple geometric shapes with brand colors.

## Integration Points

### WhatsApp Business Integration
Orders can be sent via WhatsApp with formatted message:
```javascript
const msg = `GasFill Order:%0AName:${name}%0APhone:${phone}%0A...`;
window.open(`https://wa.me/233201022153?text=${msg}`);
```

### Phone Number Handling
Ghana format: +233 prefix, business number is hardcoded in `BUSINESS_PHONE` constant.

### Service Worker Caching
- Caches main HTML files for offline support
- Uses Cache-First strategy with network fallback
- Automatically caches successful responses

## Common Tasks

### Adding New Products
1. Add product card to `.grid` in products section of `g8.html`
2. Include SVG illustration following existing pattern
3. Add `onclick="addToCart('id','name',price)"` to button
4. Update price mapping in single order form if needed

### Modifying Order Status Flow
Orders have status progression: `pending` → `accepted` → `delivered`
- Auto-rotation happens every 25 seconds via `updateOrderStatuses()`
- Manual status updates via dashboard buttons

### Styling Updates
- Maintain mobile-first responsive breakpoints (1000px, 768px, 640px)
- Use existing CSS custom properties for consistency
- Follow card-based layout pattern with consistent border-radius (10-14px)

## Key Files Context
- Both HTML files are complete, standalone applications
- No external dependencies except Google Fonts (Inter)
- localStorage keys are versioned (`_v1`) for future migration support
- All contact info and pricing is hardcoded for Ghana market (₵ currency)