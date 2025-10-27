/**
 * WebSocket Connection Test Script
 * Run this to test WebSocket connectivity before mobile app testing
 */

const WebSocket = require('ws');

const WS_URL = 'ws://192.168.1.25:8000/ws';

console.log('🧪 WebSocket Connection Test');
console.log('==============================');
console.log(`Connecting to: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server!');
  console.log('📤 Sending ping...\n');
  
  // Send a ping message
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: new Date().toISOString()
  }));
  
  // Send a test message
  setTimeout(() => {
    console.log('📤 Sending test message...\n');
    ws.send(JSON.stringify({
      type: 'test',
      data: { message: 'Hello from test script!' },
      timestamp: new Date().toISOString()
    }));
  }, 2000);
  
  // Close connection after 5 seconds
  setTimeout(() => {
    console.log('\n🔌 Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message:');
    console.log(JSON.stringify(message, null, 2));
    console.log('');
  } catch (error) {
    console.log('📥 Received raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('👋 Disconnected from WebSocket server');
  console.log('\n✅ Test complete!');
  process.exit(0);
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted');
  ws.close();
  process.exit(0);
});
