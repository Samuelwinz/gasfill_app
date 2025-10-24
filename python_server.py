#!/usr/bin/env python3
"""
GasFill Python Backend Server
A modern FastAPI server for the GasFill LPG delivery application
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import uvicorn
import jwt
import hashlib
import secrets
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

# Configuration
SECRET_KEY = "gasfill_super_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

# Security
security = HTTPBearer(auto_error=False)

# In-memory storage (in production, use a real database)
users_db: Dict[str, Dict] = {}
orders_db: List[Dict] = []
order_counter = 1

# Data Models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OrderItem(BaseModel):
    name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    items: List[OrderItem]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    total: float
    delivery_type: Optional[str] = "standard"

class OrderStatusUpdate(BaseModel):
    status: str

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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = users_db.get(email)
        return user
    except jwt.PyJWTError:
        return None

# API Routes

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "GasFill Python API",
        "version": "2.0.0"
    }

@app.post("/api/auth/register")
async def register_user(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    if user_data.email in users_db:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )
    
    # Create new user
    user_id = len(users_db) + 1
    hashed_password = hash_password(user_data.password)
    
    user = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password": hashed_password,
        "phone": user_data.phone,
        "address": user_data.address,
        "created_at": datetime.utcnow().isoformat(),
        "is_active": True
    }
    
    users_db[user_data.email] = user
    
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
            "address": user["address"]
        }
    }

@app.post("/api/auth/login")
async def login_user(login_data: UserLogin):
    """Login user"""
    user = users_db.get(login_data.email)
    
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": login_data.email}, expires_delta=access_token_expires
    )
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user["phone"],
            "address": user["address"]
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
        "items": [item.dict() for item in order_data.items],
        "customerName": order_data.customer_name or "Anonymous",
        "customerPhone": order_data.customer_phone or "",
        "deliveryAddress": order_data.customer_address or "To be provided",
        "total": order_data.total,
        "status": "pending",
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat()
    }
    
    orders_db.insert(0, order)  # Add to beginning of list
    order_counter += 1
    
    return order

@app.get("/api/orders")
async def get_orders():
    """Get all orders"""
    return orders_db

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Get a specific order by ID"""
    order = next((order for order in orders_db if order["id"] == order_id), None)
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    return order

@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    """Update order status"""
    order = next((order for order in orders_db if order["id"] == order_id), None)
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    order["status"] = status_update.status
    order["updatedAt"] = datetime.utcnow().isoformat()
    
    return order

@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: str):
    """Delete an order"""
    global orders_db
    orders_db = [order for order in orders_db if order["id"] != order_id]
    return {"message": "Order deleted successfully"}

@app.get("/api/stats")
async def get_stats():
    """Get application statistics"""
    total_orders = len(orders_db)
    pending_orders = len([o for o in orders_db if o["status"] in ["pending", "accepted", "assigned"]])
    total_revenue = sum(order["total"] for order in orders_db if order["status"] == "delivered")
    
    return {
        "totalOrders": total_orders,
        "pendingOrders": pending_orders,
        "totalRevenue": total_revenue,
        "totalUsers": len(users_db),
        "recentOrders": orders_db[:5]  # Last 5 orders
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
            self.active_connections.remove(websocket)

        async def send_personal_message(self, message: str, websocket: WebSocket):
            await websocket.send_text(message)

        async def broadcast(self, message: str):
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except:
                    self.disconnect(connection)

    manager = ConnectionManager()

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                data = await websocket.receive_text()
                await manager.broadcast(f"Message: {data}")
        except WebSocketDisconnect:
            manager.disconnect(websocket)
            
except ImportError:
    print("WebSocket support not available. Install with: pip install websockets")

# Development server configuration
if __name__ == "__main__":
    print("🚀 Starting GasFill Python Backend Server...")
    print("📊 API Documentation: http://localhost:5002/api/docs")
    print("🔄 Health Check: http://localhost:5002/api/health")
    print("🔐 Authentication: JWT-based with email/password")
    print("📦 Orders: Full CRUD operations")
    print("⚡ Real-time: WebSocket support available")
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=5002,
        reload=False,
        log_level="info"
    )