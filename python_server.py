#!/usr/bin/env python3
"""
GasFill Python Backend Server
A modern FastAPI server for the GasFill LPG delivery application
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import uvicorn
import jwt
import hashlib
import secrets
import hmac
import requests
import asyncio
from datetime import datetime, timedelta, UTC
import json
import os
from pathlib import Path
import db  # Import the database module

# Configuration
SECRET_KEY = "gasfill_super_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ADMIN_KEY = "gasfill_admin_master_key_2025"  # Admin access key

# Paystack Configuration
PAYSTACK_SECRET_KEY = "sk_test_ef024f3acd90ee6aef29ff0707f868c163dc73a3"  # Your actual secret key
PAYSTACK_PUBLIC_KEY = "pk_test_8f47d72c938927ad07587345c116684e3ce8266f"  # Your actual public key
PAYSTACK_WEBHOOK_SECRET = "your_webhook_secret_here"  # Replace with your actual webhook secret

# Utility function for timezone-aware datetime
def utc_now():
    """Get current UTC datetime using the new recommended API"""
    return datetime.now(UTC)

# FastAPI app initialization
app = FastAPI(
    title="GasFill API",
    description="Backend API for GasFill LPG delivery service",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=current_dir), name="static")

# Utility Functions
def safe_parse_datetime(date_string: str) -> Optional[datetime]:
    """Safely parse a datetime string, returning None if invalid or empty"""
    if not date_string or not date_string.strip():
        return None
    try:
        return datetime.fromisoformat(date_string)
    except (ValueError, TypeError):
        return None

def safe_parse_date(date_string: str) -> Optional[datetime]:
    """Safely parse a datetime string and return just the date, returning None if invalid or empty"""
    parsed_dt = safe_parse_datetime(date_string)
    return parsed_dt.date() if parsed_dt else None

# Serve HTML files at root
@app.get("/admin.html")
async def serve_admin_html():
    admin_html_path = current_dir / "admin.html"
    if admin_html_path.exists():
        return FileResponse(admin_html_path)
    raise HTTPException(status_code=404, detail="Admin page not found")

@app.get("/app.html")
async def serve_app_html():
    app_html_path = current_dir / "app.html"
    if app_html_path.exists():
        return FileResponse(app_html_path)
    raise HTTPException(status_code=404, detail="App page not found")

@app.get("/g8.html")
async def serve_g8_html():
    g8_html_path = current_dir / "g8.html"
    if g8_html_path.exists():
        return FileResponse(g8_html_path)
    raise HTTPException(status_code=404, detail="G8 page not found")

@app.get("/gasfill_verion3.html")
async def serve_gasfill_v3_html():
    v3_html_path = current_dir / "gasfill_verion3.html"
    if v3_html_path.exists():
        return FileResponse(v3_html_path)
    raise HTTPException(status_code=404, detail="GasFill v3 page not found")

@app.get("/rider.html")
async def serve_rider_html():
    rider_html_path = current_dir / "rider.html"
    if rider_html_path.exists():
        return FileResponse(rider_html_path)
    raise HTTPException(status_code=404, detail="Rider dashboard not found")

@app.get("/")
async def serve_index():
    # Serve admin.html as default index
    return await serve_admin_html()

# Security
security = HTTPBearer(auto_error=False)

# In-memory storage (in production, use a real database)
users_db: Dict[str, Dict] = {}
orders_db: List[Dict] = []
services_db: List[Dict] = []
riders_db: Dict[str, Dict] = {}  # Rider database
order_counter = 1
service_counter = 1
rider_counter = 1

# Enhanced earning system databases (initialized after models)
earnings_db: List[Dict] = []  # List of earning entries
pending_payments_db: List[Dict] = []  # Pending payments to riders
payment_history_db: List[Dict] = []  # Completed payments history

# Data Models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = "user"  # "user" or "admin"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    admin_key: str  # Special admin key for additional security

class RiderRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: str
    license_number: str
    vehicle_type: str  # "motorcycle", "bicycle", "car"
    vehicle_number: str
    emergency_contact: str
    area_coverage: str  # Areas they can deliver to

class RiderLogin(BaseModel):
    email: EmailStr
    password: str

class RiderStatusUpdate(BaseModel):
    status: str  # "available", "busy", "offline"
    location: Optional[Dict[str, float]] = None  # {"lat": float, "lng": float}

class DeliveryUpdate(BaseModel):
    status: str  # Valid: assigned -> pickup -> in_transit -> delivered
    location: Optional[str] = None  # Address or location string
    notes: Optional[str] = None
    delivery_photo: Optional[str] = None  # Base64 image or URL

# Order status flow constants
ORDER_STATUS_FLOW = {
    "pending": ["assigned"],  # Customer creates order, awaits assignment
    "assigned": ["pickup", "picked_up", "pending"],  # Rider accepts, can go to pickup or cancel back (support both pickup and picked_up)
    "pickup": ["in_transit", "assigned"],  # Rider collecting cylinder from depot
    "picked_up": ["in_transit", "assigned"],  # Legacy status - same as pickup
    "in_transit": ["delivered", "pickup", "picked_up"],  # Rider delivering to customer
    "delivered": [],  # Final successful state
    "cancelled": []  # Terminal cancelled state
}

def validate_status_transition(current_status: str, new_status: str) -> bool:
    """Validate if status transition is allowed in the order flow"""
    if current_status not in ORDER_STATUS_FLOW:
        return False
    allowed_transitions = ORDER_STATUS_FLOW[current_status]
    return new_status in allowed_transitions

class OrderItem(BaseModel):
    name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    items: List[OrderItem]
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    total: float
    delivery_type: Optional[str] = "standard"

class OrderStatusUpdate(BaseModel):
    status: str

class ServiceRequest(BaseModel):
    serviceType: str  # "pickup", "refill", "pickup_and_refill"
    customerName: str
    customerPhone: Optional[str] = None
    customerEmail: str
    userId: Optional[int] = None
    serviceAddress: str
    cylinderCount: str
    cylinderSize: str
    serviceDate: str
    serviceTime: str
    serviceInstructions: Optional[str] = None
    totalCost: float
    status: Optional[str] = "pending"  # pending, assigned, pickup_in_progress, collected, refill_in_progress, ready_for_delivery, delivery_in_progress, completed, cancelled

class ServiceStatusUpdate(BaseModel):
    status: str
    location: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    photo_proof: Optional[str] = None  # Base64 encoded image or URL

class ServiceAssignment(BaseModel):
    service_id: str
    rider_id: int
    estimated_pickup_time: Optional[str] = None
    special_instructions: Optional[str] = None
    status: str

# Payment Models
class PaymentVerificationRequest(BaseModel):
    reference: str

class PaymentWebhookPayload(BaseModel):
    event: str
    data: Dict[str, Any]

class PaymentOrderData(BaseModel):
    items: List[OrderItem]
    total: float
    customerName: str
    customerPhone: str
    customerEmail: EmailStr
    deliveryAddress: str
    paymentStatus: str = "pending"
    paymentMethod: str = "paystack"
    paymentReference: Optional[str] = None
    paymentData: Optional[Dict[str, Any]] = None

# Earning Models
class EarningEntry(BaseModel):
    rider_id: int
    order_id: Optional[str] = None
    service_id: Optional[str] = None
    earning_type: str  # "delivery", "service", "bonus", "penalty"
    amount: float
    commission_rate: Optional[float] = None
    gross_amount: Optional[float] = None
    description: str
    date: str

class CommissionStructure(BaseModel):
    delivery_base_rate: float = 0.15  # 15% of order value (legacy)
    rider_commission_rate: float = 0.80  # 80% of delivery fee goes to rider
    delivery_fee: float = 10.0  # Fixed delivery fee per order
    service_pickup_fee: float = 15.0  # Fixed fee for pickup service
    service_refill_fee: float = 20.0  # Fixed fee for refill service
    bonus_threshold: int = 10  # Orders needed for daily bonus
    daily_bonus: float = 50.0  # Bonus for completing threshold
    weekly_bonus_threshold: int = 50  # Orders needed for weekly bonus
    weekly_bonus: float = 200.0  # Weekly bonus amount

class PaymentRequest(BaseModel):
    rider_id: int
    amount: float
    payment_method: str = "mobile_money"  # mobile_money, bank_transfer, cash
    recipient_details: Dict[str, Any]

# Initialize commission structure with default values
commission_structure = CommissionStructure()

# Utility functions
def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        expire = utc_now() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_admin(user: dict) -> bool:
    """Check if user has admin role"""
    return user and user.get("role") == "admin"

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current admin user from JWT token"""
    user = get_current_user(credentials)
    if not user or not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role", "user")
        
        if email is None:
            return None
        
        # Check database based on role
        if role == "rider":
            user = db.get_rider_by_email(email)
            if user:
                user["role"] = "rider"
        else:
            user = db.get_user_by_email(email)
        
        return user
    except jwt.PyJWTError:
        return None

def get_current_rider(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current rider from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        
        if email is None or role != "rider":
            raise HTTPException(
                status_code=401,
                detail="Invalid rider token"
            )
        
        rider = db.get_rider_by_email(email)
        if not rider:
            raise HTTPException(
                status_code=401,
                detail="Rider not found"
            )
        
        return rider
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

# API Routes

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": utc_now().isoformat(),
        "service": "GasFill Python API",
        "version": "2.0.0"
    }

@app.post("/api/auth/register")
async def register_user(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )
    
    # Create new user in database
    hashed_password = hash_password(user_data.password)
    
    user = db.create_user({
        "username": user_data.username,
        "email": user_data.email,
        "password": hashed_password,
        "phone": user_data.phone,
        "address": user_data.address,
        "role": user_data.role,
        "is_active": True
    })
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user["phone"],
            "address": user["address"],
            "role": user.get("role", "user")
        }
    }

@app.post("/api/auth/login")
async def login_user(login_data: dict):
    """Login endpoint for regular users"""
    email = login_data.get("email")
    password = login_data.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    user = db.get_user_by_email(email)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    if not verify_password(password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user["phone"],
            "address": user["address"],
            "role": user.get("role", "user")
        }
    }

@app.post("/api/auth/admin-login")
async def admin_login(admin_data: AdminLogin):
    """Admin login with additional security"""
    # Verify admin key
    if admin_data.admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin key"
        )
    
    user = db.get_user_by_email(admin_data.email)
    
    if not user or not verify_password(admin_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    # Check if user has admin role
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES * 2)  # Longer session for admin
    access_token = create_access_token(
        data={"sub": admin_data.email, "role": "admin"}, expires_delta=access_token_expires
    )
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user["phone"],
            "address": user["address"],
            "role": user["role"]
        }
    }

@app.get("/api/users/list")
async def list_all_users():
    """List all registered customers (for debugging/testing)"""
    customers = []
    for email, user in users_db.items():
        customers.append({
            "id": user.get("id"),
            "email": email,
            "name": user.get("name") or user.get("username"),
            "phone": user.get("phone"),
            "address": user.get("address"),
            "role": user.get("role", "customer"),
            "created_at": user.get("created_at")
        })
    
    riders = []
    for email, rider in riders_db.items():
        riders.append({
            "id": rider.get("id"),
            "email": email,
            "username": rider.get("username"),
            "phone": rider.get("phone"),
            "vehicle_type": rider.get("vehicle_type"),
            "status": rider.get("status"),
            "rating": rider.get("rating"),
            "created_at": rider.get("created_at")
        })
    
    return {
        "total_customers": len(customers),
        "total_riders": len(riders),
        "customers": customers,
        "riders": riders
    }

@app.post("/api/auth/rider-register")
async def rider_register(rider_data: RiderRegister):
    """Register a new rider"""
    # Check if rider already exists
    existing_rider = db.get_rider_by_email(rider_data.email)
    if existing_rider:
        raise HTTPException(
            status_code=400,
            detail="Rider with this email already exists"
        )
    
    # Hash password
    hashed_password = hash_password(rider_data.password)
    
    # Create rider record in database
    rider = db.create_rider({
        "username": rider_data.username,
        "email": rider_data.email,
        "password": hashed_password,
        "phone": rider_data.phone,
        "license_number": rider_data.license_number,
        "vehicle_type": rider_data.vehicle_type,
        "vehicle_number": rider_data.vehicle_number,
        "emergency_contact": rider_data.emergency_contact,
        "area_coverage": rider_data.area_coverage,
        "status": "offline",
        "location": None,
        "rating": 5.0,
        "total_deliveries": 0,
        "successful_deliveries": 0,
        "earnings": 0.0,
        "commission_rate": 0.8,
        "delivery_fee": 10.0,
        "is_verified": False,
        "is_active": True,
        "is_suspended": False,
        "document_status": "pending"
    })
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": rider_data.email, "role": "rider"}, expires_delta=access_token_expires
    )
    
    return {
        "message": "Rider registered successfully",
        "token": access_token,
        "rider": {
            "id": rider["id"],
            "username": rider["username"],
            "email": rider["email"],
            "phone": rider["phone"],
            "vehicle_type": rider["vehicle_type"],
            "status": rider["status"],
            "is_verified": rider["is_verified"]
        }
    }

@app.post("/api/auth/rider-login")
async def rider_login(rider_data: RiderLogin):
    """Rider login"""
    rider = db.get_rider_by_email(rider_data.email)
    
    if not rider or not verify_password(rider_data.password, rider["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    if not rider.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="Rider account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": rider_data.email, "role": "rider"}, expires_delta=access_token_expires
    )
    
    # Update rider status to available
    rider["status"] = "available"
    rider["updated_at"] = utc_now().isoformat()
    
    return {
        "token": access_token,
        "rider": {
            "id": rider["id"],
            "username": rider["username"],
            "email": rider["email"],
            "phone": rider["phone"],
            "vehicle_type": rider["vehicle_type"],
            "vehicle_number": rider["vehicle_number"],
            "area_coverage": rider["area_coverage"],
            "status": rider["status"],
            "rating": rider["rating"],
            "total_deliveries": rider["total_deliveries"],
            "is_verified": rider["is_verified"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )
    
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "phone": current_user["phone"],
        "address": current_user["address"]
    }

@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
async def create_order(order_data: OrderCreate):
    """Create a new order"""
    global order_counter
    
    order = {
        "id": f"ORD-{order_counter}",
        "items": [item.model_dump() for item in order_data.items],
        "customer_name": order_data.customer_name or "Anonymous",
        "customer_phone": order_data.customer_phone or "",
        "customer_address": order_data.customer_address or "To be provided",
        "customer_email": order_data.customer_email or "guest",
        "delivery_type": order_data.delivery_type or "standard",
        "total": order_data.total,
        "status": "pending",
        "payment_status": "pending",
        "created_at": utc_now().isoformat(),
        "updated_at": utc_now().isoformat()
    }
    
    # Save to database
    result = db.create_order(order)
    order_counter += 1
    
    return result

@app.get("/api/orders")
async def get_orders(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all orders or customer's orders if authenticated"""
    # Try to get current user
    user = get_current_user(credentials)
    
    # If user is authenticated and not admin, return only their orders
    if user and not is_admin(user):
        customer_orders = db.get_orders_for_customer(user.get("email"))
        return customer_orders
    
    # If not authenticated or is admin, return all orders
    return db.get_all_orders()

@app.get("/api/customer/orders")
async def get_customer_orders(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get customer's orders with rider information (requires authentication)"""
    current_user = get_current_user(credentials)
    
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    customer_email = current_user.get("email")
    customer_orders = db.get_orders_for_customer(customer_email)
    
    # Enrich orders with rider information
    enriched_orders = []
    for order in customer_orders:
        enriched_order = order.copy()
        
        # Add rider info if order has a rider assigned
        rider_id = order.get("rider_id")
        if rider_id:
            rider = db.get_rider_by_id(rider_id)
            if rider:
                enriched_order["rider_name"] = rider.get("username")
                enriched_order["rider_phone"] = rider.get("phone")
                enriched_order["rider_rating"] = rider.get("rating")
        
        enriched_orders.append(enriched_order)
    
    return enriched_orders

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a specific order by ID (with permission check)"""
    order = db.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    # Check permissions - allow if user is admin or owns the order
    user = get_current_user(credentials)
    if user:
        if is_admin(user):
            return order
        elif user.get("email") == order.get("customer_email"):
            return order
        else:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to view this order"
            )
    
    # Allow unauthenticated access for now (can restrict later)
    return order

@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    """Update order status"""
    order = db.update_order_status(order_id, status_update.status)
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    return order

@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: str):
    """Delete an order"""
    db.delete_order(order_id)
    return {"message": "Order deleted successfully"}

@app.get("/api/stats")
async def get_stats():
    """Get application statistics"""
    all_orders = db.get_all_orders()
    total_orders = len(all_orders)
    pending_orders = len([o for o in all_orders if o["status"] in ["pending", "accepted", "assigned"]])
    total_revenue = sum(order["total"] for order in all_orders if order["status"] == "delivered")
    
    return {
        "totalOrders": total_orders,
        "pendingOrders": pending_orders,
        "totalRevenue": total_revenue,
        "totalUsers": len(users_db),
        "recentOrders": all_orders[:5]  # Last 5 orders
    }

# Service Management Endpoints
@app.post("/api/services", status_code=status.HTTP_201_CREATED)
async def create_service_request(service: ServiceRequest, current_user: dict = Depends(get_current_user)):
    """Create a new service request"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    global service_counter
    service_data = service.model_dump()
    service_data.update({
        "id": str(service_counter),
        "user_id": current_user["id"],
        "customer_name": service_data["customerName"],
        "customer_phone": service_data.get("customerPhone", ""),
        "customer_email": current_user["email"],
        "service_type": service_data["serviceType"],
        "service_address": service_data["serviceAddress"],
        "cylinder_count": service_data["cylinderCount"],
        "cylinder_size": service_data["cylinderSize"],
        "service_date": service_data["serviceDate"],
        "service_time": service_data["serviceTime"],
        "service_instructions": service_data.get("serviceInstructions", ""),
        "total_cost": service_data["totalCost"],
        "status": service_data.get("status", "pending"),
        "created_at": utc_now().isoformat(),
        "updated_at": utc_now().isoformat()
    })
    
    services_db.append(service_data)
    service_counter += 1
    
    return service_data

@app.get("/api/services")
async def get_service_requests(current_user: dict = Depends(get_current_user)):
    """Get all service requests for the current user"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Filter services for the current user
    user_services = [
        service for service in services_db 
        if service.get("user_id") == current_user["id"] or 
           service.get("customer_email") == current_user["email"]
    ]
    
    return user_services

@app.get("/api/services/{service_id}")
async def get_service_request(service_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific service request"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    service = next((service for service in services_db if service["id"] == service_id), None)
    
    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )
    
    # Check if user owns this service request
    if service.get("user_id") != current_user["id"] and service.get("customer_email") != current_user["email"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )
    
    return service

@app.patch("/api/services/{service_id}/status")
async def update_service_status(service_id: str, status_update: ServiceStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update service request status"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    service = next((service for service in services_db if service["id"] == service_id), None)
    
    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )
    
    # Check if user owns this service request OR is an admin OR is a rider assigned to this service
    is_owner = service.get("user_id") == current_user["id"] or service.get("customer_email") == current_user["email"]
    is_admin = current_user.get("role") == "admin"
    is_assigned_rider = current_user.get("role") == "rider" and service.get("assigned_rider") == current_user["id"]
    
    if not (is_owner or is_admin or is_assigned_rider):
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )
    
    service["status"] = status_update.status
    service["updated_at"] = utc_now().isoformat()
    
    return service

@app.delete("/api/services/{service_id}")
async def delete_service_request(service_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a service request"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    global services_db
    service = next((service for service in services_db if service["id"] == service_id), None)
    
    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )
    
    # Check if user owns this service request
    if service.get("user_id") != current_user["id"] and service.get("customer_email") != current_user["email"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )
    
    services_db = [s for s in services_db if s["id"] != service_id]
    return {"message": "Service request deleted successfully"}

# ========================
# SERVICE-RIDER MANAGEMENT SYSTEM
# ========================

@app.get("/api/services/available")
async def get_available_services():
    """Get all services available for assignment (admin and riders can see)"""
    available_services = [
        service for service in services_db 
        if service.get("status") in ["pending", "assigned"]
    ]
    
    # Add area-based filtering logic here if needed
    return sorted(available_services, key=lambda x: x.get("created_at", ""), reverse=True)

@app.post("/api/admin/services/{service_id}/assign")
async def assign_service_to_rider(
    service_id: str,
    assignment: ServiceAssignment,
    current_admin: dict = Depends(get_current_admin)
):
    """Assign a service to a rider (admin only)"""
    # Find the service
    service = next((s for s in services_db if s["id"] == service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Find the rider
    rider = next((r for r in riders_db.values() if r["id"] == assignment.rider_id), None)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    # Check if rider is available
    if rider.get("status") != "available":
        raise HTTPException(status_code=400, detail="Rider is not available")
    
    # Assign service to rider
    service["assigned_rider_id"] = assignment.rider_id
    service["assigned_rider_name"] = rider["username"]
    service["assigned_at"] = utc_now().isoformat()
    service["status"] = "assigned"
    service["estimated_pickup_time"] = assignment.estimated_pickup_time
    service["special_instructions"] = assignment.special_instructions
    service["updated_at"] = utc_now().isoformat()
    
    # Update rider status
    rider["status"] = "busy"
    rider["current_service_id"] = service_id
    rider["updated_at"] = utc_now().isoformat()
    
    return {
        "message": f"Service {service_id} assigned to {rider['username']}",
        "service": service,
        "rider": {
            "id": rider["id"],
            "name": rider["username"],
            "phone": rider.get("phone", ""),
            "status": rider["status"]
        }
    }

@app.get("/api/rider/services/available")
async def get_available_services_for_rider(current_rider: dict = Depends(get_current_rider)):
    """Get services available for the current rider to accept"""
    # Get unassigned services in rider's coverage area
    rider_area = current_rider.get("area_coverage", "")
    
    available_services = [
        service for service in services_db 
        if (service.get("status") == "pending" and 
            (not rider_area or rider_area.lower() in service.get("service_address", "").lower()))
    ]
    
    return sorted(available_services, key=lambda x: x.get("created_at", ""), reverse=True)

@app.post("/api/rider/services/{service_id}/accept")
async def accept_service(
    service_id: str,
    current_rider: dict = Depends(get_current_rider)
):
    """Rider accepts a service request"""
    # Find the service
    service = next((s for s in services_db if s["id"] == service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if service is available
    if service.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Service is no longer available")
    
    # Check if rider is available
    if current_rider.get("status") != "available":
        raise HTTPException(status_code=400, detail="You are not available to accept services")
    
    # Assign service to rider
    service["assigned_rider_id"] = current_rider["id"]
    service["assigned_rider_name"] = current_rider["username"]
    service["assigned_at"] = utc_now().isoformat()
    service["status"] = "assigned"
    service["updated_at"] = utc_now().isoformat()
    
    # Update rider status
    current_rider["status"] = "busy"
    current_rider["current_service_id"] = service_id
    current_rider["updated_at"] = utc_now().isoformat()
    
    return {
        "message": "Service accepted successfully",
        "service": service,
        "next_step": "Navigate to customer location for pickup"
    }

@app.put("/api/rider/services/{service_id}/status")
async def update_service_status_detailed(
    service_id: str, 
    status_update: ServiceStatusUpdate, 
    current_rider: dict = Depends(get_current_rider)
):
    """Update service status with detailed workflow tracking"""
    # Find the service
    service = next((s for s in services_db if s["id"] == service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if service.get("assigned_rider_id") != current_rider["id"]:
        raise HTTPException(status_code=403, detail="Service not assigned to you")

    # Update service status and track progress
    old_status = service.get("status")
    service["status"] = status_update.status
    service["updated_at"] = utc_now().isoformat()
    
    # Add location and notes if provided
    if status_update.location:
        service["current_location"] = status_update.location
        current_rider["location"] = status_update.location
    
    if status_update.notes:
        if "status_notes" not in service:
            service["status_notes"] = []
        service["status_notes"].append({
            "status": status_update.status,
            "notes": status_update.notes,
            "timestamp": utc_now().isoformat()
        })
    
    if status_update.photo_proof:
        if "photos" not in service:
            service["photos"] = []
        service["photos"].append({
            "status": status_update.status,
            "photo": status_update.photo_proof,
            "timestamp": utc_now().isoformat()
        })

    # Handle specific status transitions and earnings
    response_data = {
        "message": "Service status updated successfully",
        "service": service
    }

    if status_update.status == "pickup_in_progress":
        service["pickup_started_at"] = utc_now().isoformat()
        response_data["message"] = "Pickup started - Navigate to customer location"
        
    elif status_update.status == "collected":
        service["collected_at"] = utc_now().isoformat()
        response_data["message"] = "Cylinders collected - Proceed to refill station"
        
        # Record pickup completion earning
        pickup_earning = record_earning(
            rider_id=current_rider["id"],
            earning_type="service_pickup",
            amount=commission_structure.service_pickup_fee,
            service_id=service_id,
            description=f"Pickup completed for service {service_id}"
        )
        response_data["earnings"] = {
            "pickup_fee": commission_structure.service_pickup_fee,
            "stage": "pickup_completed"
        }
        
    elif status_update.status == "refill_in_progress":
        service["refill_started_at"] = utc_now().isoformat()
        response_data["message"] = "Refill in progress - Wait for completion"
        
    elif status_update.status == "ready_for_delivery":
        service["refill_completed_at"] = utc_now().isoformat()
        response_data["message"] = "Refill completed - Ready for delivery to customer"
        
        # Record refill completion earning
        refill_earning = record_earning(
            rider_id=current_rider["id"],
            earning_type="service_refill",
            amount=commission_structure.service_refill_fee,
            service_id=service_id,
            description=f"Refill completed for service {service_id}"
        )
        response_data["earnings"] = {
            "refill_fee": commission_structure.service_refill_fee,
            "stage": "refill_completed"
        }
        
    elif status_update.status == "delivery_in_progress":
        service["delivery_started_at"] = utc_now().isoformat()
        response_data["message"] = "Delivery in progress - Navigate to customer"
        
    elif status_update.status == "completed":
        # Complete service workflow
        service["completed_at"] = utc_now().isoformat()
        
        # Calculate total service earnings
        service_type = service.get("serviceType", "pickup_and_refill")
        total_earnings = 0
        earnings_breakdown = []
        
        # Award any remaining earnings based on service type
        if service_type == "pickup":
            if not any(e for e in earnings_db if e["service_id"] == service_id and e["earning_type"] == "service_pickup"):
                pickup_earning = record_earning(
                    rider_id=current_rider["id"],
                    earning_type="service_pickup",
                    amount=commission_structure.service_pickup_fee,
                    service_id=service_id,
                    description=f"Pickup service {service_id} completed"
                )
                earnings_breakdown.append(pickup_earning)
                total_earnings += commission_structure.service_pickup_fee
                
        elif service_type == "refill":
            if not any(e for e in earnings_db if e["service_id"] == service_id and e["earning_type"] == "service_refill"):
                refill_earning = record_earning(
                    rider_id=current_rider["id"],
                    earning_type="service_refill",
                    amount=commission_structure.service_refill_fee,
                    service_id=service_id,
                    description=f"Refill service {service_id} completed"
                )
                earnings_breakdown.append(refill_earning)
                total_earnings += commission_structure.service_refill_fee
                
        elif service_type == "pickup_and_refill":
            # Check if pickup earning was already recorded
            if not any(e for e in earnings_db if e["service_id"] == service_id and e["earning_type"] == "service_pickup"):
                pickup_earning = record_earning(
                    rider_id=current_rider["id"],
                    earning_type="service_pickup",
                    amount=commission_structure.service_pickup_fee,
                    service_id=service_id,
                    description=f"Pickup phase of service {service_id}"
                )
                earnings_breakdown.append(pickup_earning)
                total_earnings += commission_structure.service_pickup_fee
            
            # Check if refill earning was already recorded
            if not any(e for e in earnings_db if e["service_id"] == service_id and e["earning_type"] == "service_refill"):
                refill_earning = record_earning(
                    rider_id=current_rider["id"],
                    earning_type="service_refill",
                    amount=commission_structure.service_refill_fee,
                    service_id=service_id,
                    description=f"Refill phase of service {service_id}"
                )
                earnings_breakdown.append(refill_earning)
                total_earnings += commission_structure.service_refill_fee
        
        # Update rider stats
        current_rider["total_services"] = current_rider.get("total_services", 0) + 1
        current_rider["status"] = "available"
        current_rider["current_service_id"] = None
        
        # Check and award bonuses
        bonuses = check_and_award_bonuses(current_rider["id"])
        
        # Add completion details
        service["total_earnings"] = total_earnings
        service["earnings_breakdown"] = earnings_breakdown
        
        response_data.update({
            "message": "Service completed successfully! ✅",
            "earnings": {
                "total_earned": total_earnings,
                "breakdown": earnings_breakdown,
                "bonuses_awarded": bonuses
            },
            "service_summary": {
                "type": service_type,
                "duration": "Calculated based on timestamps",
                "customer": service.get("customerName"),
                "status": "completed"
            }
        })
        
    elif status_update.status == "cancelled":
        service["cancelled_at"] = utc_now().isoformat()
        current_rider["status"] = "available"
        current_rider["current_service_id"] = None
        response_data["message"] = "Service cancelled"

    # Update rider's last activity
    current_rider["updated_at"] = utc_now().isoformat()

    return response_data

@app.get("/api/rider/services/current")
async def get_current_service(current_rider: dict = Depends(get_current_rider)):
    """Get rider's current active service"""
    current_service_id = current_rider.get("current_service_id")
    
    if not current_service_id:
        return {"message": "No active service", "service": None}
    
    service = next((s for s in services_db if s["id"] == current_service_id), None)
    
    if not service:
        # Clean up rider status if service not found
        current_rider["current_service_id"] = None
        current_rider["status"] = "available"
        return {"message": "No active service", "service": None}
    
    return {
        "service": service,
        "workflow_steps": get_service_workflow_steps(service.get("serviceType", "pickup_and_refill")),
        "current_step": service.get("status", "assigned"),
        "next_actions": get_next_service_actions(service.get("status", "assigned"))
    }

def get_service_workflow_steps(service_type: str) -> List[str]:
    """Get the workflow steps for a service type"""
    base_steps = ["assigned", "pickup_in_progress", "collected"]
    
    if service_type in ["refill", "pickup_and_refill"]:
        base_steps.extend(["refill_in_progress", "ready_for_delivery"])
    
    base_steps.extend(["delivery_in_progress", "completed"])
    return base_steps

def get_next_service_actions(current_status: str) -> List[str]:
    """Get possible next actions based on current status"""
    actions_map = {
        "assigned": ["Start pickup (pickup_in_progress)", "Cancel service"],
        "pickup_in_progress": ["Confirm collection (collected)", "Cancel service"],
        "collected": ["Start refill (refill_in_progress)", "Ready for delivery (if no refill needed)"],
        "refill_in_progress": ["Refill complete (ready_for_delivery)"],
        "ready_for_delivery": ["Start delivery (delivery_in_progress)"],
        "delivery_in_progress": ["Complete service (completed)", "Report issue"],
        "completed": ["Service finished"],
        "cancelled": ["Service cancelled"]
    }
    return actions_map.get(current_status, [])

@app.get("/api/admin/services/assignments")
async def get_service_assignments(current_admin: dict = Depends(get_current_admin)):
    """Get all service assignments for admin monitoring"""
    assignments = []
    
    for service in services_db:
        if service.get("assigned_rider_id"):
            rider = next((r for r in riders_db.values() if r["id"] == service["assigned_rider_id"]), None)
            
            assignment_info = {
                "service_id": service["id"],
                "service_type": service.get("serviceType"),
                "customer_name": service.get("customerName"),
                "status": service.get("status"),
                "rider": {
                    "id": service["assigned_rider_id"],
                    "name": rider["username"] if rider else "Unknown",
                    "phone": rider.get("phone", "") if rider else "",
                    "status": rider.get("status", "") if rider else ""
                },
                "assigned_at": service.get("assigned_at"),
                "estimated_completion": service.get("estimated_completion"),
                "progress": {
                    "pickup_started": service.get("pickup_started_at"),
                    "collected": service.get("collected_at"),
                    "refill_started": service.get("refill_started_at"),
                    "refill_completed": service.get("refill_completed_at"),
                    "delivery_started": service.get("delivery_started_at"),
                    "completed": service.get("completed_at")
                }
            }
            assignments.append(assignment_info)
    
    return sorted(assignments, key=lambda x: x.get("assigned_at", ""), reverse=True)

# Admin Management Endpoints
@app.get("/api/admin/dashboard")
async def get_admin_dashboard(current_admin: dict = Depends(get_current_admin)):
    """Get admin dashboard overview"""
    all_orders = db.get_all_orders()
    all_users = db.get_all_users()
    total_users = len(all_users)
    total_orders = len(all_orders)
    total_services = len(services_db)
    active_users = len([u for u in all_users if u.get("is_active", True)])
    pending_orders = len([o for o in all_orders if o["status"] == "pending"])
    pending_services = len([s for s in services_db if s["status"] == "pending"])
    
    # Calculate revenue
    total_revenue = sum(order["total"] for order in all_orders if order["status"] == "delivered")
    monthly_revenue = sum(
        order["total"] for order in all_orders 
        if order["status"] == "delivered" and 
        datetime.fromisoformat(order["created_at"]).month == datetime.now().month
    )
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "new_this_month": len([u for u in all_users 
                                 if datetime.fromisoformat(u["created_at"]).month == datetime.now().month])
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "completed": len([o for o in all_orders if o["status"] == "delivered"])
        },
        "services": {
            "total": total_services,
            "pending": pending_services,
            "completed": len([s for s in services_db if s["status"] == "completed"])
        },
        "revenue": {
            "total": total_revenue,
            "monthly": monthly_revenue
        },
        "recent_activity": {
            "recent_orders": orders_db[-5:],
            "recent_services": services_db[-5:]
        }
    }

@app.get("/api/admin/users")
async def get_all_users(current_admin: dict = Depends(get_current_admin)):
    """Get all users for admin dashboard"""
    users = db.get_all_users()
    all_orders = db.get_all_orders()
    
    users_list = []
    for user in users:
        # Count user's orders and services
        user_orders = len([o for o in all_orders if o.get("customer_email") == user["email"]])
        user_services = len([s for s in services_db if s.get("customer_email") == user["email"]])
        
        users_list.append({
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user.get("phone"),
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "created_at": user["created_at"],
            "order_count": user_orders,
            "service_count": user_services
        })
    
    return users_list

@app.get("/api/admin/orders")
async def get_all_orders(current_admin: dict = Depends(get_current_admin)):
    """Get all orders for admin dashboard"""
    return db.get_all_orders()

@app.get("/api/admin/services")
async def get_all_services(current_admin: dict = Depends(get_current_admin)):
    """Get all service requests for admin dashboard"""
    return services_db

@app.get("/api/admin/riders")
async def get_all_riders(current_admin: dict = Depends(get_current_admin)):
    """Get all riders for admin dashboard"""
    riders = db.get_all_riders()
    all_orders = db.get_all_orders()
    
    riders_list = []
    for rider in riders:
        # Count rider's deliveries
        rider_deliveries = len([o for o in all_orders if o.get("rider_id") == rider.get("id") and o.get("status") == "delivered"])
        
        riders_list.append({
            "id": rider.get("id"),
            "email": rider.get("email"),
            "username": rider.get("username"),
            "phone": rider.get("phone"),
            "vehicle_type": rider.get("vehicle_type"),
            "vehicle_number": rider.get("vehicle_number"),
            "license_number": rider.get("license_number"),
            "status": rider.get("status", "available"),
            "rating": rider.get("rating", 0.0),
            "total_deliveries": rider_deliveries,
            "earnings": rider.get("earnings", 0.0),
            "area_coverage": rider.get("area_coverage"),
            "is_active": rider.get("is_active", True),
            "is_verified": rider.get("is_verified", False),
            "is_suspended": rider.get("is_suspended", False),
            "document_status": rider.get("document_status", "pending"),
            "verification_date": rider.get("verification_date"),
            "suspension_reason": rider.get("suspension_reason"),
            "created_at": rider.get("created_at")
        })
    
    return riders_list

@app.post("/api/admin/riders/{rider_id}/verify")
async def verify_rider(rider_id: int, verification_data: dict, current_admin: dict = Depends(get_current_admin)):
    """Verify rider documents and approve for deliveries"""
    rider = db.get_rider_by_id(rider_id)
    
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    # Update rider verification status
    db.update_rider(rider_id, {
        "is_verified": verification_data.get("is_verified", True),
        "verification_date": utc_now().isoformat(),
        "verification_notes": verification_data.get("notes", ""),
        "document_status": "approved" if verification_data.get("is_verified") else "rejected"
    })
    
    updated_rider = db.get_rider_by_id(rider_id)
    
    return {
        "message": "Rider verification status updated successfully",
        "rider": {
            "id": updated_rider["id"],
            "username": updated_rider["username"],
            "is_verified": updated_rider["is_verified"],
            "document_status": updated_rider["document_status"],
            "verification_date": updated_rider["verification_date"]
        }
    }

@app.post("/api/admin/riders/{rider_id}/suspend")
async def suspend_rider(rider_id: int, suspension_data: dict, current_admin: dict = Depends(get_current_admin)):
    """Suspend or reactivate rider account"""
    rider = db.get_rider_by_id(rider_id)
    
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    is_suspended = suspension_data.get("is_suspended", True)
    
    # Update rider suspension status
    db.update_rider(rider_id, {
        "is_suspended": is_suspended,
        "is_active": not is_suspended,
        "status": "suspended" if is_suspended else "available",
        "suspension_date": utc_now().isoformat() if is_suspended else None,
        "suspension_reason": suspension_data.get("reason", "No reason provided") if is_suspended else None
    })
    
    updated_rider = db.get_rider_by_id(rider_id)
    
    return {
        "message": f"Rider {'suspended' if is_suspended else 'reactivated'} successfully",
        "rider": {
            "id": updated_rider["id"],
            "username": updated_rider["username"],
            "status": updated_rider["status"],
            "is_suspended": updated_rider.get("is_suspended", False),
            "suspension_reason": updated_rider.get("suspension_reason")
        }
    }

@app.get("/api/admin/riders/{rider_id}/earnings")
async def get_rider_earnings(rider_id: int, current_admin: dict = Depends(get_current_admin)):
    """Get detailed rider earnings breakdown"""
    rider = db.get_rider_by_id(rider_id)
    
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    # Get all delivered orders for this rider
    rider_orders = [o for o in orders_db if o.get("rider_id") == rider_id and o.get("status") == "delivered"]
    
    # Calculate earnings
    total_deliveries = len(rider_orders)
    commission_rate = rider.get("commission_rate", 0.8)  # 80% default
    delivery_fee = rider.get("delivery_fee", 10.0)
    earnings_per_delivery = delivery_fee * commission_rate
    total_earnings = total_deliveries * earnings_per_delivery
    
    # Calculate today's earnings
    today = datetime.now().date()
    today_deliveries = [o for o in rider_orders if datetime.fromisoformat(o["created_at"]).date() == today]
    today_earnings = len(today_deliveries) * earnings_per_delivery
    
    # Calculate this week's earnings
    week_start = datetime.now() - timedelta(days=datetime.now().weekday())
    week_deliveries = [o for o in rider_orders if datetime.fromisoformat(o["created_at"]) >= week_start]
    week_earnings = len(week_deliveries) * earnings_per_delivery
    
    # Calculate this month's earnings
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_deliveries = [o for o in rider_orders if datetime.fromisoformat(o["created_at"]) >= month_start]
    month_earnings = len(month_deliveries) * earnings_per_delivery
    
    return {
        "rider_id": rider_id,
        "username": rider["username"],
        "total_earnings": total_earnings,
        "today_earnings": today_earnings,
        "week_earnings": week_earnings,
        "month_earnings": month_earnings,
        "total_deliveries": total_deliveries,
        "today_deliveries": len(today_deliveries),
        "week_deliveries": len(week_deliveries),
        "month_deliveries": len(month_deliveries),
        "commission_rate": commission_rate,
        "delivery_fee": delivery_fee,
        "earnings_per_delivery": earnings_per_delivery,
        "recent_deliveries": [
            {
                "order_id": o["id"],
                "customer_name": o.get("customer_name", "Unknown"),
                "delivery_address": o.get("delivery_address", "Unknown"),
                "total": o.get("total", 0),
                "delivery_fee": delivery_fee,
                "rider_earnings": earnings_per_delivery,
                "delivered_at": o.get("updated_at", o.get("created_at"))
            }
            for o in rider_orders[-10:]  # Last 10 deliveries
        ]
    }

@app.get("/api/admin/riders/{rider_id}/performance")
async def get_rider_performance(rider_id: int, current_admin: dict = Depends(get_current_admin)):
    """Get rider performance metrics and ratings"""
    rider = db.get_rider_by_id(rider_id)
    
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    # Get all orders (delivered and others)
    all_orders_db = db.get_all_orders()
    all_orders = [o for o in all_orders_db if o.get("rider_id") == rider_id]
    delivered_orders = [o for o in all_orders if o.get("status") == "delivered"]
    cancelled_orders = [o for o in all_orders if o.get("status") == "cancelled"]
    
    total_assigned = len(all_orders)
    total_delivered = len(delivered_orders)
    total_cancelled = len(cancelled_orders)
    completion_rate = (total_delivered / total_assigned * 100) if total_assigned > 0 else 0
    
    # Calculate average delivery time (mock data - would need timestamps in real scenario)
    avg_delivery_time = 25  # minutes (placeholder)
    
    # Get ratings from delivered orders (would be stored in order feedback)
    ratings = [o.get("rider_rating", 0) for o in delivered_orders if o.get("rider_rating")]
    avg_rating = sum(ratings) / len(ratings) if ratings else rider.get("rating", 0.0)
    
    # Performance score (0-100)
    performance_score = (completion_rate * 0.5) + (avg_rating / 5 * 100 * 0.3) + (min(avg_delivery_time, 30) / 30 * 100 * 0.2)
    
    return {
        "rider_id": rider_id,
        "username": rider["username"],
        "overall_rating": avg_rating,
        "total_ratings": len(ratings),
        "performance_score": round(performance_score, 2),
        "completion_rate": round(completion_rate, 2),
        "total_assigned_orders": total_assigned,
        "total_delivered_orders": total_delivered,
        "total_cancelled_orders": total_cancelled,
        "average_delivery_time_minutes": avg_delivery_time,
        "on_time_delivery_rate": 85.5,  # Placeholder
        "customer_satisfaction": round(avg_rating / 5 * 100, 2),
        "status": rider.get("status", "available"),
        "is_verified": rider.get("is_verified", False),
        "is_suspended": rider.get("is_suspended", False),
        "vehicle_type": rider.get("vehicle_type"),
        "area_coverage": rider.get("area_coverage"),
        "member_since": rider.get("created_at"),
        "recent_feedback": [
            {
                "order_id": o["id"],
                "customer_name": o.get("customer_name", "Anonymous"),
                "rating": o.get("rider_rating", 0),
                "comment": o.get("rider_feedback", ""),
                "date": o.get("updated_at", o.get("created_at"))
            }
            for o in delivered_orders[-5:] if o.get("rider_rating")
        ]
    }

@app.patch("/api/admin/users/{user_id}/status")
async def update_user_status(user_id: int, status_data: dict, current_admin: dict = Depends(get_current_admin)):
    """Update user status (activate/deactivate)"""
    user = db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    db.update_user(user_id, {"is_active": status_data.get("is_active", True)})
    updated_user = db.get_user_by_id(user_id)
    
    return {"message": "User status updated successfully", "user": updated_user}

@app.patch("/api/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status_update: OrderStatusUpdate, current_admin: dict = Depends(get_current_admin)):
    """Admin update order status"""
    order = next((order for order in orders_db if order["id"] == order_id), None)
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    order["status"] = status_update.status
    order["updated_at"] = utc_now().isoformat()
    
    return order

@app.patch("/api/admin/services/{service_id}/status")
async def admin_update_service_status(service_id: str, status_update: ServiceStatusUpdate, current_admin: dict = Depends(get_current_admin)):
    """Admin update service status"""
    service = next((service for service in services_db if service["id"] == service_id), None)
    
    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )
    
    service["status"] = status_update.status
    service["updated_at"] = utc_now().isoformat()
    
    return service

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    """Delete a user (admin only)"""
    global users_db
    user_email = None
    
    for email, user in users_db.items():
        if user["id"] == user_id:
            user_email = email
            break
    
    if not user_email:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    del users_db[user_email]
    return {"message": "User deleted successfully"}

# ==========================================
# PUBLIC RIDER API ENDPOINTS
# ==========================================

@app.get("/api/riders/{rider_id}")
async def get_rider_by_id(rider_id: int):
    """Get public rider information by ID (for order tracking, etc.)"""
    rider = db.get_rider_by_id(rider_id)
    
    if not rider:
        raise HTTPException(
            status_code=404,
            detail="Rider not found"
        )
    
    # Return only public information (no sensitive data like password)
    return {
        "id": rider["id"],
        "username": rider["username"],
        "phone": rider["phone"],
        "vehicle_type": rider["vehicle_type"],
        "vehicle_number": rider["vehicle_number"],
        "area_coverage": rider["area_coverage"],
        "status": rider["status"],
        "location": rider.get("location"),
        "rating": rider["rating"],
        "total_deliveries": rider["total_deliveries"],
        "is_verified": rider["is_verified"],
        "is_active": rider["is_active"]
    }

# ==========================================
# RIDER API ENDPOINTS
# ==========================================

@app.get("/api/rider/dashboard")
async def get_rider_dashboard(current_rider: dict = Depends(get_current_rider)):
    """Get rider dashboard data with 80% commission on delivery fees"""
    print(f"\n{'='*60}")
    print(f"🎯 RIDER DASHBOARD REQUEST")
    print(f"{'='*60}")
    
    # Get rider ID (handle both 'id' and 'rider_id' fields)
    rider_id = current_rider.get("id") or current_rider.get("rider_id")
    print(f"👤 Rider ID: {rider_id}")
    print(f"👤 Rider Username: {current_rider.get('username')}")
    print(f"👤 Rider Status: {current_rider.get('status')}")
    
    # Get all orders from database
    all_orders = db.get_all_orders()
    
    # Filter for orders assigned to this rider
    rider_orders = [
        order for order in all_orders 
        if order.get("rider_id") == rider_id
    ]
    
    # Get rider's assigned services
    rider_services = [
        service for service in services_db 
        if service.get("assigned_rider_id") == rider_id
    ]
    
    print(f"\n📦 ORDERS ANALYSIS:")
    print(f"   Total orders in DB: {len(all_orders)}")
    print(f"   Rider's orders found: {len(rider_orders)}")
    if rider_orders:
        print(f"   Order IDs: {[o.get('id') for o in rider_orders]}")
        print(f"   Order statuses: {[(o.get('id'), o.get('status')) for o in rider_orders]}")
    
    # Calculate statistics
    today = utc_now().date()
    today_orders = [
        order for order in rider_orders 
        if datetime.fromisoformat(order["created_at"]).date() == today
    ]
    
    today_services = [
        service for service in rider_services 
        if datetime.fromisoformat(service["created_at"]).date() == today
    ]
    
    active_orders = [order for order in rider_orders if order["status"] in ["assigned", "picked_up", "in_transit", "pickup"]]
    active_services = [service for service in rider_services if service["status"] in ["assigned", "in_progress"]]
    
    completed_today_orders = [order for order in today_orders if order["status"] == "delivered"]
    completed_services_today = [service for service in today_services if service["status"] == "completed"]
    
    print(f"\n📊 STATS:")
    print(f"   Active orders: {len(active_orders)}")
    print(f"   Active services: {len(active_services)}")
    print(f"   Completed today: {len(completed_today_orders)}")
    print(f"   Total deliveries: {len([o for o in rider_orders if o['status'] == 'delivered'])}")
    
    # Calculate earnings with 80% commission
    # Each delivered order earns rider 80% of delivery fee
    rider_earnings_per_delivery = commission_structure.delivery_fee * commission_structure.rider_commission_rate
    
    # Calculate total earnings from delivered orders
    total_delivered_orders = len([order for order in rider_orders if order["status"] == "delivered"])
    total_order_earnings = total_delivered_orders * rider_earnings_per_delivery
    
    # Calculate service earnings
    completed_services = len([s for s in rider_services if s["status"] == "completed"])
    service_earnings = (completed_services * commission_structure.service_pickup_fee) + \
                      (completed_services * commission_structure.service_refill_fee)
    
    total_earnings = total_order_earnings + service_earnings
    
    # Calculate today's earnings
    today_delivered = len(completed_today_orders)
    today_earnings = (today_delivered * rider_earnings_per_delivery) + \
                    (len(completed_services_today) * (commission_structure.service_pickup_fee + commission_structure.service_refill_fee))
    
    print(f"\n� EARNINGS:")
    print(f"   Commission rate: {commission_structure.rider_commission_rate * 100}%")
    print(f"   Delivery fee: ₵{commission_structure.delivery_fee}")
    print(f"   Earnings per delivery: ₵{rider_earnings_per_delivery}")
    print(f"   Total deliveries: {total_delivered_orders}")
    print(f"   Total earnings: ₵{total_earnings}")
    print(f"   Today's earnings: ₵{today_earnings}")
    print(f"{'='*60}\n")
    
    # Return in format expected by mobile app
    dashboard_data = {
        "status": current_rider["status"],
        "total_earnings": round(total_earnings, 2),
        "today_earnings": round(today_earnings, 2),
        "total_deliveries": total_delivered_orders + completed_services,
        "active_orders": len(active_orders) + len(active_services),
        "completed_today": len(completed_today_orders) + len(completed_services_today),
        "rating": current_rider["rating"],
        "commission_rate": commission_structure.rider_commission_rate,
        "delivery_fee": commission_structure.delivery_fee,
        "earnings_per_delivery": round(rider_earnings_per_delivery, 2)
    }
    
    print(f"📤 Returning dashboard data: {dashboard_data}\n")
    return dashboard_data

@app.get("/api/rider/orders")
async def get_rider_orders(
    status: Optional[str] = None,
    current_rider: dict = Depends(get_current_rider)
):
    """Get orders assigned to the current rider
    
    Status filter options:
    - assigned: Orders accepted but not yet started
    - pickup: Orders where rider is collecting cylinder
    - in_transit: Orders being delivered to customer
    - delivered: Completed deliveries
    - None (default): All orders for this rider
    """
    # Get all orders from database
    all_orders = db.get_all_orders()
    
    # Get rider ID (handle both 'id' and 'rider_id' fields)
    rider_id = current_rider.get("id") or current_rider.get("rider_id")
    
    # Filter for orders assigned to this rider
    rider_orders = [
        order for order in all_orders 
        if order.get("rider_id") == rider_id
    ]
    
    # Apply status filter if provided
    if status:
        rider_orders = [
            order for order in rider_orders 
            if order.get("status") == status
        ]
    
    # Sort by creation date (newest first)
    rider_orders.sort(
        key=lambda x: x.get("created_at", ""), 
        reverse=True
    )
    
    return rider_orders

@app.get("/api/rider/orders/available")
async def get_available_orders(current_rider: dict = Depends(get_current_rider)):
    """Get orders available for pickup in rider's area"""
    # Get unassigned orders from SQLite database
    all_orders = db.get_all_orders()
    available_orders = [
        order for order in all_orders 
        if order.get("status") == "pending" and not order.get("rider_id")
    ]
    
    # TODO: Filter by rider's area coverage and location proximity
    return available_orders[:20]  # Limit to 20 orders

@app.post("/api/rider/orders/{order_id}/accept")
async def accept_order(order_id: str, current_rider: dict = Depends(get_current_rider)):
    """Accept an order for delivery - transitions from pending to assigned"""
    # Get order from database
    order = db.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order is available for assignment
    if order.get("status") != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Order is not available (current status: {order.get('status')})"
        )
    
    if order.get("rider_id"):
        raise HTTPException(
            status_code=400,
            detail="Order already assigned to another rider"
        )
    
    # Get rider ID (handle both 'id' and 'rider_id' fields)
    rider_id = current_rider.get("id") or current_rider.get("rider_id")
    
    # Create tracking info with assignment details
    tracking_info = {
        "rider_id": rider_id,
        "rider_name": current_rider.get("username", "Unknown Rider"),
        "rider_phone": current_rider.get("phone", ""),
        "assigned_at": utc_now().isoformat(),
        "status_history": [
            {
                "status": "assigned",
                "timestamp": utc_now().isoformat(),
                "note": "Order accepted by rider"
            }
        ],
        "current_location": None,
        "notes": []
    }
    
    # Update order: set status to 'assigned' and assign rider
    updated_at = utc_now().isoformat()
    
    from pathlib import Path
    import sqlite3
    
    DB_PATH = Path(__file__).parent / 'gasfill.db'
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    tracking_json = json.dumps(tracking_info)
    cur.execute(
        '''UPDATE orders SET status=?, updated_at=?, tracking_info=?, rider_id=? WHERE id=?''', 
        ("assigned", updated_at, tracking_json, rider_id, order_id)
    )
    conn.commit()
    conn.close()
    
    # Get the updated order
    updated_order = db.get_order_by_id(order_id)
    
    return {
        "success": True,
        "message": "Order accepted successfully",
        "order_id": order_id,
        "status": "assigned",
        "rider_id": rider_id,
        "tracking_info": tracking_info
    }

@app.put("/api/rider/orders/{order_id}/status")
async def update_delivery_status(
    order_id: str, 
    status_update: DeliveryUpdate,
    current_rider: dict = Depends(get_current_rider)
):
    """Update delivery status with proper state validation"""
    # Get order from database
    order = db.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify rider ownership
    order_rider_id = order.get("rider_id")
    current_rider_id = current_rider.get("id") or current_rider.get("rider_id")
    
    if order_rider_id != current_rider_id:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this order"
        )
    
    # Validate status transition
    current_status = order.get("status")
    new_status = status_update.status
    
    if not validate_status_transition(current_status, new_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current_status} -> {new_status}. " +
                   f"Allowed transitions: {ORDER_STATUS_FLOW.get(current_status, [])}"
        )
    
    # Get existing tracking info or create new
    tracking_info = order.get("tracking_info") or {
        "rider_id": current_rider_id,
        "rider_name": current_rider.get("username", "Unknown"),
        "status_history": [],
        "notes": []
    }
    
    # Add status to history
    status_entry = {
        "status": new_status,
        "timestamp": utc_now().isoformat(),
        "location": status_update.location
    }
    if status_update.notes:
        status_entry["note"] = status_update.notes
    
    if "status_history" not in tracking_info:
        tracking_info["status_history"] = []
    tracking_info["status_history"].append(status_entry)
    
    # Update current location if provided
    if status_update.location:
        tracking_info["current_location"] = status_update.location
        tracking_info["location_updated_at"] = utc_now().isoformat()
    
    # Add notes if provided
    if status_update.notes:
        if "notes" not in tracking_info:
            tracking_info["notes"] = []
        tracking_info["notes"].append({
            "note": status_update.notes,
            "timestamp": utc_now().isoformat(),
            "status": new_status
        })
    
    # Handle delivery completion
    if new_status == "delivered":
        tracking_info["delivered_at"] = utc_now().isoformat()
        if status_update.delivery_photo:
            tracking_info["delivery_photo"] = status_update.delivery_photo
        
        # Update rider stats
        current_rider["status"] = "available"
        current_rider["total_deliveries"] = current_rider.get("total_deliveries", 0) + 1
    
    # Update order in database
    updated_order = db.update_order_status(order_id, new_status, tracking_info)
    
    # Build response with status labels
    status_labels = {
        "assigned": "Order Assigned",
        "pickup": "Picking Up Cylinder",
        "picked_up": "Picked Up Cylinder",  # Legacy status
        "in_transit": "On the Way to Customer",
        "delivered": "Successfully Delivered"
    }
    
    return {
        "success": True,
        "message": status_labels.get(new_status, f"Status updated to {new_status}"),
        "order_id": order_id,
        "previous_status": current_status,
        "new_status": new_status,
        "tracking_info": tracking_info,
        "timestamp": utc_now().isoformat()
    }
    # Handle completion
    if status_update.status == "delivered":
        # Calculate earnings using new commission structure
        delivery_type = order.get("delivery_type", "standard")
        commission_data = calculate_delivery_commission(order["total"], delivery_type)
        
        # Record detailed earnings
        # Base commission from order value
        if commission_data["base_commission"] > 0:
            record_earning(
                rider_id=current_rider["id"],
                earning_type="delivery_commission",
                amount=commission_data["base_commission"],
                order_id=order["id"],
                description=f"Commission from order {order['id']} (₵{order['total']})",
                commission_rate=commission_data["commission_rate"],
                gross_amount=order["total"]
            )
        
        # Delivery fee
        record_earning(
            rider_id=current_rider["id"],
            earning_type="delivery_fee",
            amount=commission_data["delivery_fee"],
            order_id=order["id"],
            description=f"Delivery fee for order {order['id']} ({delivery_type})"
        )
        
        # Update rider stats
        current_rider["total_deliveries"] += 1
        current_rider["successful_deliveries"] += 1
        current_rider["status"] = "available"
        
        # Check and award bonuses
        bonuses = check_and_award_bonuses(current_rider["id"])
        
        # Add delivery completion details
        order["delivered_at"] = utc_now().isoformat()
        order["delivery_fee"] = commission_data["delivery_fee"]
        order["commission_paid"] = commission_data["base_commission"]
        if status_update.delivery_photo:
            order["delivery_photo"] = status_update.delivery_photo
        
        # Return response with earning details
        response = {
            "message": "Delivery completed successfully",
            "order": order,
            "earnings": {
                "delivery_fee": commission_data["delivery_fee"],
                "commission": commission_data["base_commission"],
                "total_earned": commission_data["total_earning"],
                "bonuses_awarded": bonuses
            }
        }
        return response
    
    return {
        "message": "Delivery status updated successfully",
        "order": order
    }

@app.put("/api/rider/status")
async def update_rider_status(
    status_update: RiderStatusUpdate,
    current_rider: dict = Depends(get_current_rider)
):
    """Update rider availability status"""
    current_rider["status"] = status_update.status
    current_rider["updated_at"] = utc_now().isoformat()
    
    if status_update.location:
        current_rider["location"] = status_update.location
    
    return {
        "message": "Status updated successfully",
        "status": current_rider["status"],
        "location": current_rider.get("location")
    }

@app.get("/api/rider/profile")
async def get_rider_profile(current_rider: dict = Depends(get_current_rider)):
    """Get rider profile information"""
    return {
        "id": current_rider["id"],
        "username": current_rider["username"],
        "email": current_rider["email"],
        "phone": current_rider["phone"],
        "license_number": current_rider["license_number"],
        "vehicle_type": current_rider["vehicle_type"],
        "vehicle_number": current_rider["vehicle_number"],
        "emergency_contact": current_rider["emergency_contact"],
        "area_coverage": current_rider["area_coverage"],
        "status": current_rider["status"],
        "rating": current_rider["rating"],
        "total_deliveries": current_rider["total_deliveries"],
        "successful_deliveries": current_rider["successful_deliveries"],
        "earnings": current_rider["earnings"],
        "is_verified": current_rider["is_verified"],
        "location": current_rider.get("location"),
        "created_at": current_rider["created_at"]
    }

@app.get("/api/rider/earnings")
async def get_rider_earnings(current_rider: dict = Depends(get_current_rider)):
    """Get rider earnings breakdown"""
    # Get rider's completed orders
    completed_orders = [
        order for order in orders_db 
        if order.get("assigned_rider_id") == current_rider["id"] and order["status"] == "delivered"
    ]
    
    # Calculate earnings by period
    today = utc_now().date()
    this_week = today - timedelta(days=today.weekday())
    this_month = today.replace(day=1)
    
    today_earnings = sum(
        order.get("delivery_fee", 10.0) 
        for order in completed_orders 
        if datetime.fromisoformat(order["delivered_at"]).date() == today
    )
    
    week_earnings = sum(
        order.get("delivery_fee", 10.0) 
        for order in completed_orders 
        if datetime.fromisoformat(order["delivered_at"]).date() >= this_week
    )
    
    month_earnings = sum(
        order.get("delivery_fee", 10.0) 
        for order in completed_orders 
        if datetime.fromisoformat(order["delivered_at"]).date() >= this_month
    )
    
    return {
        "total_earnings": current_rider["earnings"],
        "today_earnings": today_earnings,
        "week_earnings": week_earnings,
        "month_earnings": month_earnings,
        "completed_deliveries": len(completed_orders),
        "average_per_delivery": round(current_rider["earnings"] / max(len(completed_orders), 1), 2)
    }

# ========================
# ENHANCED EARNING SYSTEM
# ========================

def record_earning(rider_id: int, earning_type: str, amount: float, 
                  order_id: str = None, service_id: str = None, 
                  description: str = "", commission_rate: float = None,
                  gross_amount: float = None):
    """Record an earning entry for a rider"""
    earning_entry = {
        "id": len(earnings_db) + 1,
        "rider_id": rider_id,
        "order_id": order_id,
        "service_id": service_id,
        "earning_type": earning_type,
        "amount": amount,
        "commission_rate": commission_rate,
        "gross_amount": gross_amount,
        "description": description,
        "date": utc_now().isoformat(),
        "created_at": utc_now().isoformat()
    }
    earnings_db.append(earning_entry)
    
    # Update rider's total earnings
    rider_email = None
    for email, rider in riders_db.items():
        if rider["id"] == rider_id:
            rider["earnings"] = rider.get("earnings", 0) + amount
            rider_email = email
            break
    
    return earning_entry

def calculate_delivery_commission(order_total: float, delivery_type: str = "standard") -> Dict[str, float]:
    """Calculate commission for delivery orders"""
    base_commission = order_total * commission_structure.delivery_base_rate
    delivery_fee = commission_structure.delivery_fee
    
    # Add express delivery bonus
    if delivery_type == "express":
        delivery_fee += 5.0  # Extra ₵5 for express delivery
    
    return {
        "base_commission": base_commission,
        "delivery_fee": delivery_fee,
        "total_earning": base_commission + delivery_fee,
        "commission_rate": commission_structure.delivery_base_rate
    }

def calculate_service_commission(service_type: str) -> Dict[str, float]:
    """Calculate commission for service requests"""
    if service_type == "pickup":
        fee = commission_structure.service_pickup_fee
    elif service_type == "refill":
        fee = commission_structure.service_refill_fee
    else:
        fee = 15.0  # Default service fee
    
    return {
        "service_fee": fee,
        "total_earning": fee
    }

def check_and_award_bonuses(rider_id: int):
    """Check and award daily/weekly bonuses"""
    today = utc_now().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Count completed deliveries today
    today_deliveries = len([
        order for order in orders_db 
        if (order.get("assigned_rider_id") == rider_id and 
            order["status"] == "delivered" and
            safe_parse_date(order.get("delivered_at", "")) == today)
    ])
    
    # Count completed deliveries this week
    week_deliveries = len([
        order for order in orders_db 
        if (order.get("assigned_rider_id") == rider_id and 
            order["status"] == "delivered" and
            safe_parse_date(order.get("delivered_at", "")) and
            safe_parse_date(order.get("delivered_at", "")) >= week_start)
    ])
    
    bonuses_awarded = []
    
    # Check daily bonus
    if (today_deliveries >= commission_structure.bonus_threshold and
        not any(e for e in earnings_db 
               if e["rider_id"] == rider_id and 
                  e["earning_type"] == "daily_bonus" and
                  safe_parse_date(e.get("date", "")) == today)):
        
        bonus_entry = record_earning(
            rider_id=rider_id,
            earning_type="daily_bonus",
            amount=commission_structure.daily_bonus,
            description=f"Daily bonus for completing {today_deliveries} deliveries"
        )
        bonuses_awarded.append(bonus_entry)
    
    # Check weekly bonus
    if (week_deliveries >= commission_structure.weekly_bonus_threshold and
        not any(e for e in earnings_db 
               if e["rider_id"] == rider_id and 
                  e["earning_type"] == "weekly_bonus" and
                  safe_parse_date(e.get("date", "")) and
                  safe_parse_date(e.get("date", "")) >= week_start)):
        
        bonus_entry = record_earning(
            rider_id=rider_id,
            earning_type="weekly_bonus",
            amount=commission_structure.weekly_bonus,
            description=f"Weekly bonus for completing {week_deliveries} deliveries"
        )
        bonuses_awarded.append(bonus_entry)
    
    return bonuses_awarded

@app.get("/api/rider/earnings/detailed")
async def get_detailed_earnings(current_rider: dict = Depends(get_current_rider)):
    """Get detailed earnings breakdown with commission structure"""
    rider_earnings = [e for e in earnings_db if e["rider_id"] == current_rider["id"]]
    
    # Group earnings by type
    earnings_by_type = {}
    for earning in rider_earnings:
        earning_type = earning["earning_type"]
        if earning_type not in earnings_by_type:
            earnings_by_type[earning_type] = {"count": 0, "total": 0, "entries": []}
        earnings_by_type[earning_type]["count"] += 1
        earnings_by_type[earning_type]["total"] += earning["amount"]
        earnings_by_type[earning_type]["entries"].append(earning)
    
    # Calculate period earnings
    today = utc_now().date()
    this_week = today - timedelta(days=today.weekday())
    this_month = today.replace(day=1)
    
    today_earnings = sum(e["amount"] for e in rider_earnings 
                        if datetime.fromisoformat(e["date"]).date() == today)
    week_earnings = sum(e["amount"] for e in rider_earnings 
                       if datetime.fromisoformat(e["date"]).date() >= this_week)
    month_earnings = sum(e["amount"] for e in rider_earnings 
                        if datetime.fromisoformat(e["date"]).date() >= this_month)
    
    # Get completed orders for statistics
    completed_orders = [
        order for order in orders_db 
        if order.get("assigned_rider_id") == current_rider["id"] and order["status"] == "delivered"
    ]
    
    return {
        "total_earnings": current_rider["earnings"],
        "today_earnings": today_earnings,
        "week_earnings": week_earnings,
        "month_earnings": month_earnings,
        "earnings_by_type": earnings_by_type,
        "completed_deliveries": len(completed_orders),
        "commission_structure": {
            "delivery_base_rate": commission_structure.delivery_base_rate,
            "delivery_fee": commission_structure.delivery_fee,
            "service_pickup_fee": commission_structure.service_pickup_fee,
            "service_refill_fee": commission_structure.service_refill_fee,
            "daily_bonus": commission_structure.daily_bonus,
            "weekly_bonus": commission_structure.weekly_bonus
        },
        "recent_earnings": sorted(rider_earnings, key=lambda x: x["date"], reverse=True)[:20]
    }

@app.get("/api/rider/earnings/history")
async def get_earnings_history(
    current_rider: dict = Depends(get_current_rider),
    limit: int = 50,
    offset: int = 0
):
    """Get paginated earnings history"""
    rider_earnings = [e for e in earnings_db if e["rider_id"] == current_rider["id"]]
    sorted_earnings = sorted(rider_earnings, key=lambda x: x["date"], reverse=True)
    
    paginated_earnings = sorted_earnings[offset:offset + limit]
    
    return {
        "earnings": paginated_earnings,
        "total": len(rider_earnings),
        "has_more": len(sorted_earnings) > offset + limit
    }

@app.post("/api/rider/payment-request")
async def request_payment(
    payment_request: PaymentRequest,
    current_rider: dict = Depends(get_current_rider)
):
    """Request payment of earnings"""
    if payment_request.rider_id != current_rider["id"]:
        raise HTTPException(status_code=403, detail="Can only request payment for your own earnings")
    
    # Check if rider has sufficient earnings
    if current_rider["earnings"] < payment_request.amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient earnings. Available: ₵{current_rider['earnings']:.2f}"
        )
    
    # Check for pending payment requests
    pending_requests = [p for p in pending_payments_db 
                       if p["rider_id"] == current_rider["id"] and p["status"] == "pending"]
    if pending_requests:
        raise HTTPException(
            status_code=400, 
            detail="You already have a pending payment request"
        )
    
    # Create payment request
    payment_entry = {
        "id": len(pending_payments_db) + 1,
        "rider_id": current_rider["id"],
        "rider_name": current_rider["username"],
        "rider_email": current_rider["email"],
        "amount": payment_request.amount,
        "payment_method": payment_request.payment_method,
        "recipient_details": payment_request.recipient_details,
        "status": "pending",
        "requested_at": utc_now().isoformat(),
        "processed_at": None,
        "processed_by": None
    }
    
    pending_payments_db.append(payment_entry)
    
    return {
        "message": "Payment request submitted successfully",
        "request_id": payment_entry["id"],
        "amount": payment_request.amount,
        "estimated_processing": "1-2 business days"
    }

@app.get("/api/admin/earnings/overview")
async def get_earnings_overview(current_admin: dict = Depends(get_current_admin)):
    """Get overall earnings overview for admin"""
    total_earnings_paid = sum(r["earnings"] for r in riders_db.values())
    
    # Calculate earnings by period
    today = utc_now().date()
    this_week = today - timedelta(days=today.weekday())
    this_month = today.replace(day=1)
    
    today_earnings = sum(e["amount"] for e in earnings_db 
                        if datetime.fromisoformat(e["date"]).date() == today)
    week_earnings = sum(e["amount"] for e in earnings_db 
                       if datetime.fromisoformat(e["date"]).date() >= this_week)
    month_earnings = sum(e["amount"] for e in earnings_db 
                        if datetime.fromisoformat(e["date"]).date() >= this_month)
    
    # Group earnings by type
    earnings_by_type = {}
    for earning in earnings_db:
        earning_type = earning["earning_type"]
        if earning_type not in earnings_by_type:
            earnings_by_type[earning_type] = {"count": 0, "total": 0}
        earnings_by_type[earning_type]["count"] += 1
        earnings_by_type[earning_type]["total"] += earning["amount"]
    
    # Pending payments
    pending_amount = sum(p["amount"] for p in pending_payments_db if p["status"] == "pending")
    pending_count = len([p for p in pending_payments_db if p["status"] == "pending"])
    
    return {
        "total_earnings_paid": total_earnings_paid,
        "today_earnings": today_earnings,
        "week_earnings": week_earnings,
        "month_earnings": month_earnings,
        "earnings_by_type": earnings_by_type,
        "pending_payments": {
            "count": pending_count,
            "total_amount": pending_amount
        },
        "active_riders": len([r for r in riders_db.values() if r.get("status") == "available"]),
        "commission_structure": commission_structure.model_dump()
    }

@app.get("/api/admin/payment-requests")
async def get_payment_requests(
    current_admin: dict = Depends(get_current_admin),
    status: str = None
):
    """Get all payment requests for admin review"""
    requests = pending_payments_db
    
    if status:
        requests = [r for r in requests if r["status"] == status]
    
    return sorted(requests, key=lambda x: x["requested_at"], reverse=True)

@app.post("/api/admin/payment-requests/{request_id}/process")
async def process_payment_request(
    request_id: int,
    action: str,  # "approve" or "reject"
    current_admin: dict = Depends(get_current_admin)
):
    """Process a payment request (approve or reject)"""
    # Find the payment request
    payment_request = next((p for p in pending_payments_db if p["id"] == request_id), None)
    if not payment_request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if payment_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Payment request already processed")
    
    if action == "approve":
        # Find the rider and deduct earnings
        rider = next((r for r in riders_db.values() if r["id"] == payment_request["rider_id"]), None)
        if not rider:
            raise HTTPException(status_code=404, detail="Rider not found")
        
        if rider["earnings"] < payment_request["amount"]:
            raise HTTPException(status_code=400, detail="Rider has insufficient earnings")
        
        # Deduct earnings
        rider["earnings"] -= payment_request["amount"]
        
        # Record payment
        payment_entry = {
            "id": len(payment_history_db) + 1,
            "rider_id": payment_request["rider_id"],
            "amount": payment_request["amount"],
            "payment_method": payment_request["payment_method"],
            "processed_by": current_admin["id"],
            "processed_at": utc_now().isoformat(),
            "reference": f"PAY-{request_id}-{utc_now().strftime('%Y%m%d')}"
        }
        payment_history_db.append(payment_entry)
        
        # Update request status
        payment_request["status"] = "approved"
        payment_request["processed_at"] = utc_now().isoformat()
        payment_request["processed_by"] = current_admin["id"]
        
        return {
            "message": "Payment approved and processed",
            "reference": payment_entry["reference"],
            "amount": payment_request["amount"]
        }
        
    elif action == "reject":
        payment_request["status"] = "rejected"
        payment_request["processed_at"] = utc_now().isoformat()
        payment_request["processed_by"] = current_admin["id"]
        
        return {
            "message": "Payment request rejected"
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")

@app.get("/api/admin/commission-structure")
async def get_commission_structure(current_admin: dict = Depends(get_current_admin)):
    """Get current commission structure"""
    return commission_structure.model_dump()

@app.put("/api/admin/commission-structure")
async def update_commission_structure(
    updated_structure: CommissionStructure,
    current_admin: dict = Depends(get_current_admin)
):
    """Update commission structure"""
    global commission_structure
    commission_structure = updated_structure
    
    return {
        "message": "Commission structure updated successfully",
        "new_structure": commission_structure.model_dump()
    }

@app.get("/api/admin/earnings/statistics")
async def get_earning_statistics(
    current_admin: dict = Depends(get_current_admin),
    period: str = "month"  # "day", "week", "month", "year"
):
    """Get detailed earning statistics for admin dashboard"""
    today = utc_now().date()
    
    if period == "day":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=today.weekday())
    elif period == "month":
        start_date = today.replace(day=1)
    else:  # year
        start_date = today.replace(month=1, day=1)
    
    # Filter earnings by period
    period_earnings = [
        e for e in earnings_db 
        if datetime.fromisoformat(e["date"]).date() >= start_date
    ]
    
    # Group by rider
    earnings_by_rider = {}
    for earning in period_earnings:
        rider_id = earning["rider_id"]
        if rider_id not in earnings_by_rider:
            # Find rider info
            rider_info = next((r for r in riders_db.values() if r["id"] == rider_id), None)
            earnings_by_rider[rider_id] = {
                "rider_name": rider_info["username"] if rider_info else f"Rider {rider_id}",
                "total": 0,
                "by_type": {}
            }
        
        earnings_by_rider[rider_id]["total"] += earning["amount"]
        earning_type = earning["earning_type"]
        if earning_type not in earnings_by_rider[rider_id]["by_type"]:
            earnings_by_rider[rider_id]["by_type"][earning_type] = 0
        earnings_by_rider[rider_id]["by_type"][earning_type] += earning["amount"]
    
    # Calculate totals
    total_earnings = sum(e["amount"] for e in period_earnings)
    earnings_by_type = {}
    for earning in period_earnings:
        earning_type = earning["earning_type"]
        if earning_type not in earnings_by_type:
            earnings_by_type[earning_type] = {"count": 0, "total": 0}
        earnings_by_type[earning_type]["count"] += 1
        earnings_by_type[earning_type]["total"] += earning["amount"]
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "total_earnings": total_earnings,
        "earnings_by_type": earnings_by_type,
        "earnings_by_rider": earnings_by_rider,
        "transaction_count": len(period_earnings),
        "average_per_transaction": round(total_earnings / max(len(period_earnings), 1), 2)
    }

# Service Management for Riders
@app.get("/api/rider/services")
async def get_rider_services(current_rider: dict = Depends(get_current_rider)):
    """Get all services assigned to the current rider"""
    rider_services = [
        service for service in services_db 
        if service.get("assigned_rider_id") == current_rider["id"]
    ]
    return rider_services

@app.get("/api/rider/services/available")
async def get_available_services(current_rider: dict = Depends(get_current_rider)):
    """Get services available for assignment in rider's coverage area"""
    # Get services that are accepted by admin but not yet assigned to a rider
    available_services = [
        service for service in services_db 
        if service["status"] == "accepted" and not service.get("assigned_rider_id")
    ]
    
    # Filter by rider's area coverage (simplified matching)
    rider_area = current_rider.get("area_coverage", "").lower()
    if rider_area:
        available_services = [
            service for service in available_services
            if rider_area in service.get("service_address", "").lower()
        ]
    
    return available_services

@app.post("/api/rider/services/{service_id}/accept")
async def accept_service(service_id: str, current_rider: dict = Depends(get_current_rider)):
    """Rider accepts a service request"""
    # Find the service
    service = None
    for s in services_db:
        if s["id"] == service_id:
            service = s
            break
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Service not available for assignment")
    
    if service.get("assigned_rider_id"):
        raise HTTPException(status_code=400, detail="Service already assigned to another rider")
    
    # Assign service to rider
    service["status"] = "assigned"
    service["assigned_rider_id"] = current_rider["id"]
    service["assigned_rider_name"] = current_rider["username"]
    service["assigned_at"] = utc_now().isoformat()
    service["updated_at"] = utc_now().isoformat()
    
    # Update rider's active services count
    current_rider["updated_at"] = utc_now().isoformat()
    
    return {
        "message": "Service accepted successfully",
        "service": service
    }

@app.put("/api/rider/services/{service_id}/status")
async def update_service_status(service_id: str, status_update: ServiceStatusUpdate, 
                               current_rider: dict = Depends(get_current_rider)):
    """Update service status (in_progress, completed, etc.)"""
    # Find the service
    service = None
    for s in services_db:
        if s["id"] == service_id:
            service = s
            break
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service.get("assigned_rider_id") != current_rider["id"]:
        raise HTTPException(status_code=403, detail="Service not assigned to you")
    
    # Update service status
    service["status"] = status_update.status
    service["updated_at"] = utc_now().isoformat()
    
    # Add completion timestamp for completed services
    if status_update.status == "completed":
        service["completed_at"] = utc_now().isoformat()
        
        # Calculate service commission using new system
        service_type = service.get("service_type", "pickup")  # Default to pickup
        commission_data = calculate_service_commission(service_type)
        
        # Record service earning
        record_earning(
            rider_id=current_rider["id"],
            earning_type="service_fee",
            amount=commission_data["service_fee"],
            service_id=service["id"],
            description=f"Service fee for {service_type} service {service['id']}"
        )
        
        # Update rider stats
        current_rider["total_services"] = current_rider.get("total_services", 0) + 1
        
        # Check and award bonuses
        bonuses = check_and_award_bonuses(current_rider["id"])
        
        # Add earning details to response
        service["service_fee"] = commission_data["service_fee"]
        
        response = {
            "message": "Service completed successfully",
            "service": service,
            "earnings": {
                "service_fee": commission_data["service_fee"],
                "bonuses_awarded": bonuses
            }
        }
        return response
    
    current_rider["updated_at"] = utc_now().isoformat()
    
    return {
        "message": f"Service status updated to {status_update.status}",
        "service": service,
        "timestamp": utc_now().isoformat(),
    }

@app.get("/api/rider/services/stats")
async def get_rider_service_stats(current_rider: dict = Depends(get_current_rider)):
    """Get rider's service statistics"""
    rider_services = [
        service for service in services_db 
        if service.get("assigned_rider_id") == current_rider["id"]
    ]
    
    completed_services = [s for s in rider_services if s["status"] == "completed"]
    in_progress_services = [s for s in rider_services if s["status"] == "in_progress"]
    assigned_services = [s for s in rider_services if s["status"] == "assigned"]
    
    # Calculate service earnings
    service_earnings = len(completed_services) * 15.0  # ₵15 per service
    
    return {
        "total_services": len(rider_services),
        "completed_services": len(completed_services),
        "in_progress_services": len(in_progress_services),
        "assigned_services": len(assigned_services),
        "service_earnings": service_earnings,
        "success_rate": round((len(completed_services) / max(len(rider_services), 1)) * 100, 2)
    }

# Admin Service Management - Assign services to riders
@app.post("/api/admin/services/{service_id}/assign")
async def assign_service_to_rider(service_id: str, assignment_data: dict, 
                                 current_user: dict = Depends(get_current_admin)):
    """Admin assigns a service to a specific rider"""
    # Find the service
    service = None
    for s in services_db:
        if s["id"] == service_id:
            service = s
            break
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    rider_id = assignment_data.get("rider_id")
    if not rider_id:
        raise HTTPException(status_code=400, detail="Rider ID required")
    
    # Find the rider by ID - riders_db is keyed by email, so search through values
    rider = None
    for rider_data in riders_db.values():
        if rider_data["id"] == rider_id:
            rider = rider_data
            break
    
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    # Assign service to rider
    service["status"] = "assigned"
    service["assigned_rider_id"] = rider["id"]
    service["assigned_rider_name"] = rider["username"]
    service["assigned_at"] = utc_now().isoformat()
    service["updated_at"] = utc_now().isoformat()
    
    return {
        "message": f"Service assigned to rider {rider['username']}",
        "service": service
    }

# WebSocket support for real-time features (optional)
try:
    from fastapi import WebSocket, WebSocketDisconnect
    from typing import List as TypingList
    
    class ConnectionManager:
        def __init__(self):
            self.active_connections: TypingList[WebSocket] = []

        async def connect(self, websocket: WebSocket):
            await websocket.accept()
            self.active_connections.append(websocket)

        def disconnect(self, websocket: WebSocket):
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

        async def send_personal_message(self, message: str, websocket: WebSocket):
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"Error sending personal message: {e}")
                self.disconnect(websocket)

        async def broadcast(self, message: str):
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error broadcasting to connection: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn)

    manager = ConnectionManager()

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                try:
                    # Receive JSON data instead of plain text
                    # Add timeout to prevent hanging on Windows
                    data_text = await asyncio.wait_for(
                        websocket.receive_text(), 
                        timeout=300  # 5 minutes timeout
                    )
                    
                    try:
                        data = json.loads(data_text)
                        event_type = data.get("type", "message")
                        
                        if event_type == "message":
                            # Broadcast new message to all connected clients
                            await manager.broadcast(json.dumps({
                                "type": "message",
                                "chat_room_id": data.get("chat_room_id"),
                                "message": data.get("message"),
                                "sender_id": data.get("sender_id"),
                                "sender_type": data.get("sender_type"),
                                "sender_name": data.get("sender_name"),
                                "message_type": data.get("message_type", "text"),
                                "timestamp": data.get("timestamp")
                            }))
                        elif event_type == "typing":
                            # Broadcast typing indicator
                            await manager.broadcast(json.dumps({
                                "type": "typing",
                                "chat_room_id": data.get("chat_room_id"),
                                "user_id": data.get("user_id"),
                                "user_name": data.get("user_name"),
                                "is_typing": data.get("is_typing", True)
                            }))
                        elif event_type == "read":
                            # Broadcast read receipt
                            await manager.broadcast(json.dumps({
                                "type": "read",
                                "chat_room_id": data.get("chat_room_id"),
                                "message_ids": data.get("message_ids", []),
                                "user_id": data.get("user_id")
                            }))
                    except json.JSONDecodeError:
                        # Fallback to plain text for backward compatibility
                        await manager.broadcast(json.dumps({
                            "type": "message",
                            "message": data_text
                        }))
                except asyncio.TimeoutError:
                    # Send ping to keep connection alive
                    try:
                        await websocket.send_json({"type": "ping"})
                    except:
                        break
                except (WebSocketDisconnect, OSError, RuntimeError) as e:
                    print(f"WebSocket connection error: {e}")
                    break
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            manager.disconnect(websocket)
            
except ImportError:
    print("WebSocket support not available. Install with: pip install websockets")

# Development server configuration
# ========================
# PAYMENT ENDPOINTS (Paystack Integration)
# ========================

@app.post("/api/payments/verify")
async def verify_payment(verification: PaymentVerificationRequest):
    """Verify a Paystack payment using the transaction reference"""
    try:
        # Call Paystack API to verify payment
        headers = {
            "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"https://api.paystack.co/transaction/verify/{verification.reference}",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data["status"] and data["data"]["status"] == "success":
                return {
                    "success": True,
                    "status": "verified",
                    "amount": data["data"]["amount"] / 100,  # Convert pesewas to cedis
                    "currency": data["data"]["currency"],
                    "reference": data["data"]["reference"],
                    "gateway_response": data["data"]["gateway_response"],
                    "paid_at": data["data"]["paid_at"],
                    "customer": data["data"]["customer"]
                }
            else:
                return {
                    "success": False,
                    "status": "failed",
                    "message": "Payment verification failed"
                }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Paystack verification failed: {response.text}"
            )
            
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Payment verification error: {str(e)}"
        )

@app.post("/api/payments/webhook")
async def paystack_webhook(payload: PaymentWebhookPayload, request: Request):
    """Handle Paystack webhook notifications"""
    try:
        # Verify webhook signature (if configured)
        if PAYSTACK_WEBHOOK_SECRET:
            signature = request.headers.get("x-paystack-signature")
            if not verify_paystack_signature(await request.body(), signature):
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Process the webhook event
        event = payload.event
        data = payload.data
        
        if event == "charge.success":
            # Payment successful - update order status
            reference = data.get("reference")
            if reference:
                # Find and update the order
                for order_id, order in orders_db.items():
                    if order.get("paymentReference") == reference:
                        order["paymentStatus"] = "paid"
                        order["status"] = "confirmed"
                        order["updated_at"] = utc_now().isoformat()
                        
                        # You could add additional logic here like:
                        # - Send SMS confirmation
                        # - Notify admin
                        # - Trigger delivery assignment
                        
                        break
        
        return {"status": "webhook processed"}
        
    except Exception as e:
        print(f"Webhook processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.post("/api/orders/payment", status_code=status.HTTP_201_CREATED)
async def create_payment_order(order_data: PaymentOrderData):
    """Create a new order with payment information"""
    try:
        # Generate order ID
        order_id = f"ORD-{len(orders_db) + 1:06d}-{utc_now().strftime('%Y%m')}"
        
        # Create order object
        order = {
            "id": order_id,
            "items": [item.model_dump() for item in order_data.items],
            "total": order_data.total,
            "status": "confirmed" if order_data.paymentStatus == "paid" else "pending",
            "paymentStatus": order_data.paymentStatus,
            "paymentMethod": order_data.paymentMethod,
            "paymentReference": order_data.paymentReference,
            "paymentData": order_data.paymentData,
            "customerName": order_data.customerName,
            "customerPhone": order_data.customerPhone,
            "customerEmail": order_data.customerEmail,
            "deliveryAddress": order_data.deliveryAddress,
            "created_at": utc_now().isoformat(),
            "updated_at": utc_now().isoformat(),
            "estimated_delivery": (utc_now() + timedelta(hours=2)).isoformat(),
            "rider_id": None,
            "delivery_notes": None,
            "customer_id": None  # Since this is from the public interface
        }
        
        # Store order
        orders_db[order_id] = order
        
        # Return success response
        return {
            "success": True,
            "order_id": order_id,
            "status": order["status"],
            "estimated_delivery": order["estimated_delivery"],
            "message": "Order created successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create order: {str(e)}"
        )

def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    """Verify Paystack webhook signature"""
    if not PAYSTACK_WEBHOOK_SECRET or not signature:
        return False
    
    try:
        expected_signature = hmac.new(
            PAYSTACK_WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

# ========================
# CHAT API ENDPOINTS
# ========================

class ChatRoomCreate(BaseModel):
    order_id: int
    user_id: int
    user_type: str

class ChatMessageCreate(BaseModel):
    chat_room_id: str
    sender_id: int
    sender_type: str
    sender_name: str
    message: str
    message_type: str = 'text'
    image_url: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

class MarkAsReadRequest(BaseModel):
    message_ids: List[str]

@app.post("/api/chat/rooms")
async def create_or_get_chat_room(data: ChatRoomCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create or get existing chat room for an order"""
    try:
        # Verify authentication
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get user info
        user_email = current_user.get("email")
        user_name = current_user.get("username", "User")
        
        # Get order to find rider info if needed
        order = db.get_order_by_id(f"ORD-{data.order_id}")
        rider_id = order.get('rider_id') if order else None
        rider_name = None
        
        if rider_id:
            # Get rider name from database
            rider = db.get_rider_by_id(rider_id)
            if rider:
                rider_name = rider.get('username', 'Rider')
        
        # Create or get chat room
        chat_room = db.create_or_get_chat_room(
            order_id=data.order_id,
            customer_id=data.user_id,
            customer_name=user_name,
            rider_id=rider_id,
            rider_name=rider_name
        )
        
        return chat_room
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating chat room: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/rooms/{chat_room_id}/messages")
async def get_chat_messages_endpoint(
    chat_room_id: str,
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get message history for a chat room"""
    try:
        # Verify authentication
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        print(f"📨 Fetching messages for chat room: {chat_room_id} (limit: {limit}, offset: {offset})")
        messages = db.get_chat_messages(chat_room_id, limit, offset)
        print(f"✅ Retrieved {len(messages)} messages")
        return messages
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching chat messages: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/messages")
async def send_chat_message(message: ChatMessageCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Send a new chat message"""
    try:
        # Verify token
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Create message in database
        new_message = db.create_chat_message(message.dict())
        
        # Broadcast via WebSocket to all connected clients
        try:
            await manager.broadcast(json.dumps({
                "type": "message",
                "chat_room_id": new_message["chat_room_id"],
                "message_id": new_message["id"],
                "sender_id": new_message["sender_id"],
                "sender_type": new_message["sender_type"],
                "sender_name": new_message["sender_name"],
                "message": new_message["message"],
                "message_type": new_message["message_type"],
                "image_url": new_message.get("image_url"),
                "location_data": new_message.get("location_data"),
                "created_at": new_message["created_at"]
            }))
        except Exception as ws_error:
            print(f"WebSocket broadcast error: {ws_error}")
        
        return new_message
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/rooms/{chat_room_id}/read")
async def mark_messages_as_read(
    chat_room_id: str,
    data: MarkAsReadRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark messages as read"""
    try:
        # Verify token
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        db.mark_messages_as_read(chat_room_id, data.message_ids)
        
        # Broadcast read receipt via WebSocket
        try:
            await manager.broadcast(json.dumps({
                "type": "read",
                "chat_room_id": chat_room_id,
                "message_ids": data.message_ids,
                "user_id": current_user["id"]
            }))
        except Exception as ws_error:
            print(f"WebSocket broadcast error: {ws_error}")
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/rooms")
async def get_user_chat_rooms_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all chat rooms for the authenticated user"""
    try:
        # Verify authentication
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_email = current_user.get("email")
        user_role = current_user.get("role", "customer")
        
        # Determine user type and ID based on role
        if user_role == "rider":
            user_type = "rider"
            rider = db.get_rider_by_email(user_email)
            user_id = rider.get("id") if rider else None
        else:
            user_type = "customer"
            user = db.get_user_by_email(user_email)
            user_id = user.get("id") if user else None
        
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")
        
        chat_rooms = db.get_user_chat_rooms(user_id, user_type)
        return chat_rooms
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching chat rooms: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/rooms/{chat_room_id}/close")
async def close_chat_room(chat_room_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Close a chat room"""
    try:
        # Verify token
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        db.close_chat_room(chat_room_id)
        return {"success": True, "message": "Chat room closed"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/upload-image")
async def upload_chat_image(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload an image for chat"""
    try:
        # Verify token
        current_user = get_current_user(credentials)
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        contents = await file.read()
        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 5MB limit"
            )
        
        # Create uploads directory if it doesn't exist
        upload_dir = Path(__file__).parent / "uploads" / "chat"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"chat_{utc_now().strftime('%Y%m%d_%H%M%S')}_{current_user['id']}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Return URL
        image_url = f"/uploads/chat/{unique_filename}"
        return {
            "success": True,
            "image_url": image_url,
            "filename": unique_filename
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ========================
# SERVER INITIALIZATION
# ========================

if __name__ == "__main__":
    # Initialize database
    db.init_db()
    
    # Migrate existing in-memory orders to SQLite
    globals()['order_counter'] = db.migrate_orders(orders_db)
    
    # Clear in-memory orders after migration
    orders_db.clear()
    
    # Create default admin user if none exists in database
    admin_email = "admin@gasfill.com"
    existing_admin = db.get_user_by_email(admin_email)
    if not existing_admin:
        db.create_user({
            "username": "admin",
            "email": admin_email,
            "password": hash_password("admin123"),  # Default admin password
            "phone": "+233200000000",
            "address": "GasFill HQ, Accra",
            "role": "admin",
            "is_active": True
        })
        print("✅ Default admin user created:")
        print(f"   Email: {admin_email}")
        print(f"   Password: admin123")
        print(f"   Admin Key: {ADMIN_KEY}")
    
    # Create default rider users for testing
    rider_emails = ["rider1@gasfill.com", "rider2@gasfill.com"]
    for i, rider_email in enumerate(rider_emails, 1):
        existing_rider = db.get_rider_by_email(rider_email)
        if not existing_rider:
            db.create_rider({
                "username": f"rider{i}",
                "email": rider_email,
                "password": hash_password("rider123"),
                "phone": f"+23320000000{i}",
                "license_number": f"DL{i:04d}2025",
                "vehicle_type": "motorcycle",
                "vehicle_number": f"GR-{i:04d}-25",
                "emergency_contact": f"+23320000099{i}",
                "area_coverage": "Accra Central" if i == 1 else "Tema",
                "status": "offline",
                "location": None,
                "rating": 4.5 + (i * 0.2),
                "total_deliveries": i * 50,
                "successful_deliveries": i * 48,
                "earnings": i * 500.0,
                "commission_rate": 0.8,
                "delivery_fee": 10.0,
                "is_verified": True,
                "is_active": True,
                "is_suspended": False,
                "verification_date": utc_now().isoformat(),
                "verification_notes": "Default rider - auto-verified",
                "document_status": "approved",
                "suspension_date": None,
                "suspension_reason": None
            })
    
    if rider_emails:
        print("✅ Default rider users created:")
        for i, email in enumerate(rider_emails, 1):
            print(f"   Rider {i}: {email} / rider123")
    
    # Create sample orders for testing
    sample_customer_email = "ann@gasfill.com"
    existing_customer = db.get_user_by_email(sample_customer_email)
    if not existing_customer:
        # Create a sample customer first
        db.create_user({
            "username": "Ann Mensah",
            "email": sample_customer_email,
            "password": hash_password("customer123"),
            "phone": "+233241234567",
            "address": "123 Oxford Street, Accra",
            "role": "customer",
            "is_active": True
        })
        print(f"✅ Sample customer created: {sample_customer_email} / customer123")
    
    # Check if sample orders already exist
    existing_orders = db.get_all_orders()
    if len(existing_orders) < 3:
        # Create 5 sample orders with different statuses
        sample_orders = [
            {
                "customer_name": "Ann Mensah",
                "customer_email": sample_customer_email,
                "customer_phone": "+233241234567",
                "delivery_address": "123 Oxford Street, Accra",
                "items": [{"name": "12.5kg Gas Cylinder", "quantity": 1, "price": 150.0}],
                "total_amount": 160.0,  # 150 + 10 delivery
                "payment_method": "cash",
                "payment_status": "pending",
                "status": "assigned",
                "rider_id": 1,
                "delivery_fee": 10.0,
                "notes": "Please call when you arrive"
            },
            {
                "customer_name": "Ann Mensah",
                "customer_email": sample_customer_email,
                "customer_phone": "+233241234567",
                "delivery_address": "456 Ring Road, Accra",
                "items": [{"name": "6kg Gas Cylinder", "quantity": 2, "price": 75.0}],
                "total_amount": 160.0,  # 150 + 10 delivery
                "payment_method": "momo",
                "payment_status": "completed",
                "status": "in_transit",
                "rider_id": 1,
                "delivery_fee": 10.0,
                "notes": "Gate code: 1234"
            },
            {
                "customer_name": "Ann Mensah",
                "customer_email": sample_customer_email,
                "customer_phone": "+233241234567",
                "delivery_address": "789 Spintex Road, Accra",
                "items": [{"name": "12.5kg Gas Cylinder", "quantity": 1, "price": 150.0}],
                "total_amount": 160.0,
                "payment_method": "card",
                "payment_status": "completed",
                "status": "delivered",
                "rider_id": 2,
                "delivery_fee": 10.0,
                "notes": "Thank you!"
            },
            {
                "customer_name": "Ann Mensah",
                "customer_email": sample_customer_email,
                "customer_phone": "+233241234567",
                "delivery_address": "321 Tema Station Road, Tema",
                "items": [{"name": "6kg Gas Cylinder", "quantity": 1, "price": 75.0}],
                "total_amount": 85.0,
                "payment_method": "cash",
                "payment_status": "pending",
                "status": "pending",
                "rider_id": None,
                "delivery_fee": 10.0,
                "notes": ""
            },
            {
                "customer_name": "Ann Mensah",
                "customer_email": sample_customer_email,
                "customer_phone": "+233241234567",
                "delivery_address": "555 Airport Residential, Accra",
                "items": [{"name": "12.5kg Gas Cylinder", "quantity": 2, "price": 150.0}],
                "total_amount": 310.0,
                "payment_method": "momo",
                "payment_status": "completed",
                "status": "pickup",
                "rider_id": 2,
                "delivery_fee": 10.0,
                "notes": "Apartment 5B"
            }
        ]
        
        orders_created = 0
        for order_data in sample_orders:
            try:
                db.create_order(order_data)
                orders_created += 1
            except Exception as e:
                print(f"⚠️  Error creating sample order: {e}")
        
        if orders_created > 0:
            print(f"✅ Created {orders_created} sample orders for testing")
            print(f"   📦 Statuses: pending, assigned, in_transit, pickup, delivered")
    
    print("🚀 Starting GasFill Python Backend Server...")
    print("📊 API Documentation: http://localhost:5002/api/docs")
    print("🔄 Health Check: http://localhost:5002/api/health")
    print("🔐 Authentication: JWT-based with email/password")
    print("👑 Admin Dashboard: Admin authentication available")
    print("📦 Orders: Full CRUD operations")
    print("⚡ Real-time: WebSocket support available")
    
    uvicorn.run(
        app,
        host="0.0.0.0",  # Listen on all interfaces
        port=8000,
        reload=False,
        log_level="info"
    )