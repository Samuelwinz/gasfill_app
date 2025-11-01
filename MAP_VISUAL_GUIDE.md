# Map Display - Visual Guide

## What Customers See

### Location Picker Map View

```
┌─────────────────────────────────────────┐
│  ×  Pin Your Location           [📍]   │ ← Header with location button
├─────────────────────────────────────────┤
│                                         │
│         🏢 (Blue)                       │ ← Gas Station
│         GasFill Main Station            │
│                                         │
│                                         │
│    🚴 (Green)    🚴 (Green)            │ ← Available Riders
│    Rider A       Rider B                │
│    ⭐4.8         ⭐4.5                  │
│                                         │
│                  📍 (Red)               │ ← Customer's Location
│              Your Delivery               │   (Draggable)
│                  Here                    │
│                                         │
│         🚴 (Green)                      │ ← Another Rider
│         Rider C                          │
│         ⭐4.9                            │
├─────────────────────────────────────────┤
│  📍 5.604512, -0.187234                │ ← Coordinates
│                                         │
│  Tap or drag the marker to adjust      │ ← Instructions
│  your delivery location                 │
│                                         │
│  ┌────────────────────────────────┐   │
│  │ Map Legend:                     │   │ ← Legend
│  │ 📍 Your Location               │   │
│  │ 🏢 Gas Station                 │   │
│  │ 🚴 Available Rider             │   │
│  │                                 │   │
│  │ 3 riders available nearby      │   │
│  └────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────┐     │
│  │  ✓ Confirm Location           │     │ ← Confirm Button
│  └──────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## Marker Details

### 1. Gas Station Marker (Blue)
```
    ┌──────┐
    │  🔥  │ ← Flame badge (orange)
┌───┴──────┴───┐
│              │
│      🏢      │ ← Blue circle (50x50px)
│   Building   │   with white border
│              │
└──────────────┘
```

**Tap to see**:
- GasFill Main Station
- Accra, Ghana • 24/7
- Services: 6kg, 12.5kg, 37kg, Refills, Exchange

### 2. Rider Marker (Green)
```
┌──────────────┐
│              │
│      🚴      │ ← Green circle (44x44px)
│   Bicycle    │   with white border
│         ●    │ ← Online pulse (green)
└──────────────┘
```

**Tap to see**:
- Rider Name ⭐4.5
- Available • 150 deliveries

### 3. Customer Location Marker (Red)
```
      📍
      ││
      ││ ← Red location pin (40px)
      ││   Draggable
      \/
```

**Features**:
- Drag to adjust position
- Auto-updates coordinates
- Recalculates delivery fee

## Map Legend Explained

```
┌─────────────────────────────────┐
│ MAP LEGEND:                     │ ← Title (gray, uppercase)
├─────────────────────────────────┤
│ [📍] Your Location              │ ← Red marker + label
│ [🏢] Gas Station                │ ← Blue marker + label  
│ [🚴] Available Rider            │ ← Green marker + label
├─────────────────────────────────┤
│ 3 riders available nearby       │ ← Count (green, bold)
└─────────────────────────────────┘
```

## Color Scheme

| Element | Color | Purpose |
|---------|-------|---------|
| Customer Location | Red (#dc2626) | High visibility, draggable |
| Gas Station | Blue (#3b82f6) | Trust, reliability |
| Available Rider | Green (#10b981) | Active, available |
| Flame Badge | Orange (#f59e0b) | Gas/energy indicator |
| Online Pulse | Green (#10b981) | Live availability |

## Interactive Elements

### 1. Dragging Customer Marker
```
Initial Position:    After Drag:
     📍                   📍
     ││                   ││
     \/                   \/
    [A]        ──→       [B]

Coordinates Update:
5.604512, -0.187234  →  5.605890, -0.189012
```

### 2. Tapping Markers
```
Tap Gas Station:
┌─────────────────────────┐
│ 🏢 GasFill Main Station│ ← Popup
│ Accra, Ghana • 24/7     │
└─────────────────────────┘

Tap Rider:
┌─────────────────────────┐
│ 🚴 Rider A ⭐4.8        │ ← Popup
│ Available • 150 deliv.  │
└─────────────────────────┘
```

### 3. Map Gestures
- **Pinch**: Zoom in/out
- **Drag Map**: Pan to explore
- **Tap Marker**: See details
- **Drag Pin**: Adjust location
- **Tap Empty Area**: Place pin

## Mobile Responsiveness

### Small Screen (iPhone SE)
```
- Markers: Full size (legible)
- Legend: Compact, 2 rows
- Bottom card: 40% of screen
- Map: 60% of screen
```

### Large Screen (iPad)
```
- Markers: Full size
- Legend: Single row
- Bottom card: 30% of screen
- Map: 70% of screen
```

## Usage Flow

```
1. Customer opens checkout
   ↓
2. Taps "Pin Location"
   ↓
3. Map loads showing:
   - Gas station (blue)
   - Riders (green, multiple)
   - Default location (red)
   ↓
4. Customer explores map
   - Sees where gas comes from
   - Sees available riders
   - Understands coverage area
   ↓
5. Customer adjusts pin
   - Drags to exact location
   - Coordinates update live
   ↓
6. Customer confirms
   - Delivery fee calculated
   - Location saved
```

## Real-World Example

### Scenario: Customer in Osu, Accra

**Map View**:
```
         🏢 GasFill Main (5.6037, -0.1870)
          ↓ 3.2km
        
    🚴 Rider A (near station)
    ⭐4.8 • 200 deliveries
    
            ↓ 2.8km
    
    📍 Customer Location (5.5750, -0.2100)
       Osu, Accra
    
    🚴 Rider B (nearby)        🚴 Rider C (nearby)
    ⭐4.5 • 150 deliveries      ⭐4.9 • 300 deliveries
```

**Distance Info**:
- From station to customer: 3.2km
- Nearest rider: 0.5km away
- Delivery fee: ₵16 (₵10 base + ₵6 for distance)

**What Customer Sees**:
1. Blue station marker 3.2km north
2. Three green rider markers nearby
3. Red pin at their exact location
4. Legend explaining markers
5. Coordinates for precision

## Benefits Visualization

### Before (No Map Markers)
```
Customer sees:
- Only their red pin
- Unknown station location
- No rider information
- Uncertainty about service
```

### After (With Map Markers)
```
Customer sees:
- Gas station location (blue)
- 3 available riders (green)
- Their exact location (red)
- Full transparency
- Confidence in service
```

## Accessibility

- **Marker Contrast**: High contrast colors for visibility
- **Text Labels**: Clear, readable fonts
- **Touch Targets**: 44x44px minimum (accessible)
- **Screen Readers**: Descriptive marker titles
- **Color Blind**: Shapes differ (circle vs pin)

---

## Summary

The map display feature transforms a simple location picker into an informative, transparent service overview. Customers can see:

✅ Where their gas comes from (station location)  
✅ Who might deliver it (available riders)  
✅ How far deliveries travel (visual distance)  
✅ Service coverage area (rider distribution)  
✅ Exact delivery location (draggable pin)

**Result**: Increased trust, clarity, and customer satisfaction.
