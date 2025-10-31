"""
Comprehensive test for the earnings system
Tests all three tabs: Overview, History, and Payout
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_earnings_system():
    """Test the complete earnings system"""
    
    # Step 1: Login as rider
    print_section("STEP 1: LOGIN AS RIDER")
    login_response = requests.post(f"{BASE_URL}/api/auth/rider-login", json={
        "email": "rider1@example.com",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed:", login_response.text)
        return
    
    login_data = login_response.json()
    token = login_data["token"]
    rider = login_data["rider"]
    
    print(f"✅ Logged in as: {rider['username']} (ID: {rider['id']})")
    print(f"   Current earnings: ₵{rider['earnings']:.2f}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Test Overview Tab - Get Detailed Earnings
    print_section("STEP 2: TEST OVERVIEW TAB - GET DETAILED EARNINGS")
    earnings_response = requests.get(f"{BASE_URL}/api/rider/earnings/detailed", headers=headers)
    
    if earnings_response.status_code != 200:
        print("❌ Failed to get earnings:", earnings_response.text)
        return
    
    earnings = earnings_response.json()
    
    print(f"✅ Earnings Data Retrieved:")
    print(f"\n📊 OVERVIEW TAB DATA:")
    print(f"   Pending Earnings:    ₵{earnings.get('pending_earnings', 0):.2f}")
    print(f"   Paid Earnings:       ₵{earnings.get('paid_earnings', 0):.2f}")
    print(f"   Total Earnings:      ₵{earnings.get('total_earnings', 0):.2f}")
    print(f"\n   Today's Earnings:    ₵{earnings.get('today_earnings', 0):.2f}")
    print(f"   This Week:           ₵{earnings.get('week_earnings', 0):.2f}")
    print(f"   This Month:          ₵{earnings.get('month_earnings', 0):.2f}")
    print(f"\n   Completed Deliveries: {earnings.get('completed_deliveries', 0)}")
    
    # Verify required fields
    required_fields = ['pending_earnings', 'paid_earnings', 'total_earnings', 
                      'today_earnings', 'week_earnings', 'month_earnings', 'earnings_breakdown']
    missing_fields = [field for field in required_fields if field not in earnings]
    
    if missing_fields:
        print(f"\n⚠️  Warning: Missing fields: {missing_fields}")
    else:
        print(f"\n✅ All required fields present for Overview tab")
    
    # Step 3: Test History Tab - Earnings Breakdown
    print_section("STEP 3: TEST HISTORY TAB - EARNINGS BREAKDOWN")
    breakdown = earnings.get('earnings_breakdown', [])
    
    print(f"📝 Total earnings entries: {len(breakdown)}")
    
    if breakdown:
        print(f"\n📜 RECENT EARNINGS (Last 5):")
        for i, earning in enumerate(breakdown[:5], 1):
            print(f"\n   {i}. {earning.get('earning_type', 'unknown').upper()}")
            print(f"      Order ID:        {earning.get('order_id', 'N/A')}")
            print(f"      Amount:          ₵{earning.get('amount', 0):.2f}")
            print(f"      Status:          {earning.get('status', 'pending').upper()}")
            print(f"      Date:            {earning.get('date', 'N/A')}")
            
            # Check for detailed fields
            if earning.get('gross_amount'):
                print(f"      Gross Amount:    ₵{earning['gross_amount']:.2f}")
            if earning.get('commission_rate'):
                print(f"      Commission Rate: {earning['commission_rate']*100:.0f}%")
            if earning.get('description'):
                print(f"      Description:     {earning['description']}")
        
        # Verify breakdown fields
        sample_earning = breakdown[0]
        breakdown_fields = ['id', 'order_id', 'amount', 'date', 'status', 'earning_type']
        has_all_fields = all(field in sample_earning for field in breakdown_fields)
        
        if has_all_fields:
            print(f"\n✅ All required fields present in earnings breakdown")
        else:
            missing = [f for f in breakdown_fields if f not in sample_earning]
            print(f"\n⚠️  Warning: Missing fields in breakdown: {missing}")
    else:
        print("ℹ️  No earnings history available")
    
    # Step 4: Test Payout Tab - Request Payout
    print_section("STEP 4: TEST PAYOUT TAB - REQUEST PAYOUT")
    
    pending_balance = earnings.get('pending_earnings', 0)
    print(f"💰 Available for payout: ₵{pending_balance:.2f}")
    
    if pending_balance >= 50:
        print(f"\n🔄 Attempting to request payout of ₵{pending_balance:.2f}...")
        
        payout_response = requests.post(
            f"{BASE_URL}/api/rider/payment-request",
            headers=headers,
            json={"amount": pending_balance}
        )
        
        if payout_response.status_code == 200:
            payout_data = payout_response.json()
            print(f"✅ Payout request submitted successfully!")
            print(f"   Request ID:          {payout_data.get('request_id')}")
            print(f"   Amount:              ₵{payout_data.get('amount', 0):.2f}")
            print(f"   Processing Time:     {payout_data.get('estimated_processing')}")
            print(f"   Message:             {payout_data.get('message')}")
        else:
            error_data = payout_response.json()
            print(f"❌ Payout request failed: {error_data.get('detail', 'Unknown error')}")
    elif pending_balance > 0:
        print(f"⚠️  Balance below minimum (₵50.00)")
        
        # Test minimum validation
        print(f"\n🔄 Testing minimum payout validation...")
        payout_response = requests.post(
            f"{BASE_URL}/api/rider/payment-request",
            headers=headers,
            json={"amount": 25.0}
        )
        
        if payout_response.status_code == 400:
            error_data = payout_response.json()
            print(f"✅ Minimum validation working: {error_data.get('detail')}")
        else:
            print(f"⚠️  Minimum validation may not be working correctly")
    else:
        print("ℹ️  No pending earnings to payout")
    
    # Step 5: Commission Structure
    print_section("STEP 5: COMMISSION STRUCTURE")
    commission = earnings.get('commission_structure', {})
    
    if commission:
        print("💵 Commission Rates:")
        print(f"   Delivery Commission: {commission.get('delivery_base_rate', 0)*100:.0f}%")
        print(f"   Delivery Fee:        ₵{commission.get('delivery_fee', 0):.2f}")
        print(f"   Service Pickup Fee:  ₵{commission.get('service_pickup_fee', 0):.2f}")
        print(f"   Service Refill Fee:  ₵{commission.get('service_refill_fee', 0):.2f}")
        print(f"   Daily Bonus:         ₵{commission.get('daily_bonus', 0):.2f}")
        print(f"   Weekly Bonus:        ₵{commission.get('weekly_bonus', 0):.2f}")
    
    # Final Summary
    print_section("TEST SUMMARY")
    
    tests_passed = []
    tests_failed = []
    
    # Check Overview Tab
    if all(field in earnings for field in required_fields):
        tests_passed.append("✅ Overview Tab - All required fields present")
    else:
        tests_failed.append("❌ Overview Tab - Missing fields")
    
    # Check History Tab
    if breakdown and all(field in breakdown[0] for field in ['amount', 'status', 'date']):
        tests_passed.append("✅ History Tab - Breakdown data structure correct")
    else:
        tests_failed.append("❌ History Tab - Incomplete breakdown data")
    
    # Check Payout Tab
    if 'pending_earnings' in earnings:
        tests_passed.append("✅ Payout Tab - Pending balance available")
    else:
        tests_failed.append("❌ Payout Tab - Pending balance not calculated")
    
    print("\n📊 Results:")
    for test in tests_passed:
        print(f"   {test}")
    for test in tests_failed:
        print(f"   {test}")
    
    if not tests_failed:
        print("\n🎉 All earnings system tests passed!")
    else:
        print(f"\n⚠️  {len(tests_failed)} test(s) failed")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    try:
        test_earnings_system()
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
