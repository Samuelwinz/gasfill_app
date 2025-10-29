# Batch Geocoding Guide

## Overview
The batch geocoding system automatically converts text addresses to GPS coordinates for existing orders that don't have location data.

---

## ✅ Completed Tasks

### Task B: Fix Python Server
- **Issue**: Port 8000 was already in use
- **Solution**: Kill existing Python processes before starting
- **Status**: ✅ Server running successfully on port 8000

### Task C: Batch Geocode Existing Orders
- **Created**: `batch_geocode_orders.py` - Main geocoding script
- **Created**: `create_test_orders.py` - Helper to create test data
- **Created**: `verify_geocoded_orders.py` - Verification script
- **Status**: ✅ Successfully geocoded 10/10 test orders (100% success rate)

---

## Scripts Created

### 1. batch_geocode_orders.py
**Purpose**: Geocode orders with addresses but no coordinates

**Features**:
- ✅ Finds orders without `customer_location`
- ✅ Uses OpenStreetMap Nominatim API for geocoding
- ✅ Validates locations are within Ghana bounds
- ✅ Respects API rate limits (1.5 second delay)
- ✅ Dry-run mode for safe testing
- ✅ Comprehensive logging and statistics

**Usage**:
```bash
# Dry run (no changes)
python batch_geocode_orders.py --dry-run

# Process 5 orders (dry run)
python batch_geocode_orders.py --dry-run --limit 5

# Actually geocode all orders
python batch_geocode_orders.py

# Geocode 10 orders with 2 second delay
python batch_geocode_orders.py --limit 10 --delay 2
```

**Options**:
- `--dry-run`: Show what would be updated without making changes
- `--limit N`: Only process N orders
- `--delay N`: Delay between requests in seconds (default: 1.5)

### 2. create_test_orders.py
**Purpose**: Create sample orders with Ghana addresses for testing

**Usage**:
```bash
python create_test_orders.py
```

**Output**: Creates 10 test orders with real Ghana locations:
- Circle, Accra
- Osu, Accra
- Tema Station, Tema
- Madina Market, Greater Accra
- University of Ghana, Legon
- Accra Mall, Tetteh Quarshie
- Kotoka International Airport, Accra
- Ridge, Accra
- Dansoman, Accra
- Labadi Beach, Accra

### 3. verify_geocoded_orders.py
**Purpose**: Verify that orders were successfully geocoded

**Usage**:
```bash
python verify_geocoded_orders.py
```

**Output**: Shows all geocoded test orders with their coordinates

---

## Test Results

### Initial Test (Dry Run)
```
Total orders processed: 3
✓ Successfully geocoded: 3
✗ Failed to update: 0
⊘ Skipped (no location found): 0
```

### Full Geocoding Run
```
Total orders processed: 10
✓ Successfully geocoded: 10
✗ Failed to update: 0
⊘ Skipped (no location found): 0
✓ Database updated successfully!
```

### Verification
```
✓ Geocoded: 10
✗ Not geocoded: 0
Total: 10
```

**Success Rate**: 100% ✅

---

## How It Works

### Geocoding Process

1. **Query Database**: Find orders with `customer_address` but no `customer_location`
2. **Geocode Address**: Call Nominatim API with address + "Ghana"
3. **Validate Bounds**: Check if coordinates are within Ghana
4. **Update Database**: Save coordinates as JSON string
5. **Rate Limiting**: Wait 1.5 seconds between requests

### Data Flow

```
Database Query
    ↓
Orders Without Location
    ↓
For Each Order:
    ↓
Nominatim API Call
    ↓
Validate Ghana Bounds
    ↓
Update customer_location
    ↓
Next Order (with delay)
    ↓
Statistics Summary
```

### Database Schema

**Before Geocoding**:
```sql
customer_address: "Circle, Accra"
customer_location: NULL
```

**After Geocoding**:
```sql
customer_address: "Circle, Accra"
customer_location: '{"lat": 5.56975, "lng": -0.21509}'
```

---

## Ghana Service Area Validation

### Bounds
```python
GHANA_BOUNDS = {
    'north': 11.17,  # ~11°10'N
    'south': 4.74,   # ~4°44'N
    'west': -3.26,   # ~3°16'W
    'east': 1.20     # ~1°12'E
}
```

### Validation Logic
- Coordinates must be within Ghana geographical bounds
- Addresses outside Ghana are rejected
- Only valid Ghana locations are saved to database

---

## API Information

### Nominatim (OpenStreetMap)
- **URL**: `https://nominatim.openstreetmap.org/search`
- **Rate Limit**: 1 request per second
- **Usage Policy**: Free for fair use
- **Country Filter**: `countrycodes=gh` (Ghana only)

### Request Format
```
GET /search?q=Circle,%20Accra,%20Ghana&format=json&limit=1&countrycodes=gh
```

### Response Format
```json
[
  {
    "lat": "5.5697543",
    "lon": "-0.2150894",
    "display_name": "Circle, Accra, Greater Accra, Ghana",
    "type": "locality",
    "importance": 0.5
  }
]
```

---

## Error Handling

### Scenarios Handled

1. **Address Not Found**
   - Skip order
   - Log as "Skipped (couldn't geocode)"
   - Continue to next order

2. **Outside Ghana**
   - Reject coordinates
   - Log as "Outside Ghana bounds"
   - Skip order

3. **API Timeout**
   - Log error
   - Skip order
   - Continue processing

4. **Database Error**
   - Log error
   - Count as "Failed to update"
   - Continue processing

5. **Network Error**
   - Log error
   - Skip order
   - Continue processing

---

## Production Usage

### For Real Customer Orders

1. **Backup Database First**:
   ```bash
   copy gasfill.db gasfill_backup.db
   ```

2. **Dry Run Test**:
   ```bash
   python batch_geocode_orders.py --dry-run --limit 20
   ```

3. **Review Results**:
   - Check success rate
   - Verify addresses make sense
   - Check coordinates are in Ghana

4. **Run in Batches**:
   ```bash
   # Process 50 orders at a time
   python batch_geocode_orders.py --limit 50 --delay 2
   
   # Wait 5 minutes, then next batch
   python batch_geocode_orders.py --limit 50 --delay 2
   ```

5. **Verify Results**:
   ```bash
   python verify_geocoded_orders.py
   ```

### Best Practices

✅ **DO**:
- Always use `--dry-run` first
- Process in small batches (50-100 orders)
- Respect API rate limits (1.5+ second delay)
- Backup database before bulk operations
- Monitor success rates
- Review skipped orders manually

❌ **DON'T**:
- Process thousands of orders at once
- Use delay < 1 second (violates API terms)
- Run multiple instances simultaneously
- Ignore skipped orders (may need manual review)

---

## Manual Review Process

### For Skipped Orders

1. **Find Skipped Orders**:
   ```sql
   SELECT id, customer_address
   FROM orders
   WHERE customer_location IS NULL
   AND customer_address IS NOT NULL;
   ```

2. **Review Addresses**:
   - Check for typos
   - Add landmarks: "near Circle" instead of just "Street 123"
   - Use well-known locations

3. **Manual Geocoding**:
   - Use Google Maps to find coordinates
   - Update directly via API or admin panel
   - Or ask customer to pin location on next order

---

## Statistics Tracking

### Metrics Collected

- **Total processed**: All orders attempted
- **Successfully geocoded**: Location found and saved
- **Failed to update**: Database error during save
- **Skipped**: Location not found or outside bounds

### Example Output
```
============================================================
Summary
============================================================
Total orders processed: 100
✓ Successfully geocoded: 87
✗ Failed to update: 0
⊘ Skipped (no location found): 13
```

---

## Integration with Other Features

### Works With

✅ **Customer Order Tracking** (DeliveryTrackingScreen):
- Orders with geocoded locations show on map
- Customers can still update location manually

✅ **Rider Delivery Map** (RiderDeliveryMapScreen):
- Geocoded customer locations appear on rider's map
- Enables navigation to customer

✅ **Distance Calculations**:
- Rider assignment uses geocoded locations
- Delivery fees calculated based on distance

✅ **Update Location Feature** (Feature B):
- Geocoded location is starting point
- Customer can adjust if needed

---

## Future Enhancements

### Planned
1. **Reverse Geocoding**: Convert coordinates back to formatted addresses
2. **Batch Re-geocoding**: Re-geocode old/inaccurate locations
3. **Custom Geocoding API**: Use Google Maps for better accuracy
4. **Geocoding Confidence Scores**: Track reliability of results
5. **Address Normalization**: Standardize address formats

### Possible
- Geocoding cache to avoid duplicate API calls
- Async processing for large batches
- Admin UI for reviewing/approving geocoded locations
- SMS to customer asking to confirm geocoded location

---

## Troubleshooting

### "No orders found that need geocoding"
**Cause**: All orders either have locations or no addresses
**Solution**: Check database for orders with addresses but null locations

### "API error: 429"
**Cause**: Too many requests (rate limit exceeded)
**Solution**: Increase `--delay` parameter (e.g., `--delay 3`)

### "Outside Ghana bounds"
**Cause**: Address geocoded to wrong country
**Solution**: Add "Ghana" to address or review address for typos

### High Skip Rate
**Cause**: Addresses are too vague or incorrect
**Solution**: 
- Improve address quality in order form
- Ask customers to use landmarks
- Implement manual location pinning

---

## Command Reference

### Quick Commands

```bash
# Test with dry-run
python batch_geocode_orders.py --dry-run --limit 5

# Geocode all orders
python batch_geocode_orders.py

# Geocode with custom settings
python batch_geocode_orders.py --limit 100 --delay 2

# Create test data
python create_test_orders.py

# Verify results
python verify_geocoded_orders.py
```

---

## Summary

✅ **Feature B**: Python server fixed and running  
✅ **Feature C**: Batch geocoding system complete and tested  
✅ **Success Rate**: 10/10 orders geocoded (100%)  
✅ **Ready for Production**: Yes, with proper batching  

**Files Created**:
1. `batch_geocode_orders.py` - Main geocoding script
2. `create_test_orders.py` - Test data generator
3. `verify_geocoded_orders.py` - Verification tool
4. `BATCH_GEOCODING_GUIDE.md` - This documentation

**Next Steps**:
1. Use for real customer orders (with backups!)
2. Monitor success rates
3. Review skipped orders manually
4. Consider upgrading to paid geocoding API for higher accuracy
