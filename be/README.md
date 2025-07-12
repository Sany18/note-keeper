# NK Backend - Device Management and File Sharing

A NestJS backend server that provides WebSocket-based device management and file sharing capabilities.

## Features

- **Device Management**: Track and manage online devices per user
- **WebSocket Communication**: Real-time communication between devices
- **File Transfer**: Direct file sharing between authenticated devices
- **User Authentication**: Integration with Google OAuth from frontend
- **Device Detection**: Automatic device type, OS, and browser detection

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
WS_PORT=3001
```

### Running the Server

```bash
# Development mode with hot reloading
pnpm run start:dev

# Production mode
pnpm run start:prod

# Debug mode
pnpm run start:debug
```

The server will start on `http://localhost:3001`

## API Endpoints

### Device Management

- `GET /devices/user/:userHash` - Get all devices for a user
- `GET /devices/user/:userHash/online` - Get online devices for a user
- `GET /devices/online` - Get all online devices
- `POST /devices/generate-hash` - Generate user hash from user info

### File Transfers

- `GET /file-transfers/:transferId` - Get transfer details
- `GET /file-transfers/device/:deviceId` - Get transfers for a device
- `POST /file-transfers/:transferId/status` - Update transfer status
- `POST /file-transfers/cleanup` - Clean up old transfers

## WebSocket Events

### Client → Server

- `register-device` - Register a new device
- `get-my-devices` - Get devices for current user
- `request-file-transfer` - Request file transfer to another device
- `file-transfer-response` - Respond to file transfer request
- `file-chunk` - Send file chunk data
- `ping` - Keep connection alive

### Server → Client

- `device-registered` - Device registration confirmation
- `my-devices` - List of user's devices
- `devices-updated` - Updated device list
- `file-transfer-request` - Incoming file transfer request
- `file-transfer-response` - Response to file transfer request
- `file-chunk` - Incoming file chunk
- `transfer-error` - Transfer error notification
- `pong` - Ping response

## Architecture

### Device Service
- Manages device registration and tracking
- Handles online/offline status
- Generates user hashes for authentication
- Provides device lookup and management

### Device Gateway
- WebSocket gateway for real-time communication
- Handles device events and file transfers
- Manages connection lifecycle
- Broadcasts updates to connected devices

### File Transfer Service
- Manages file transfer sessions
- Handles chunked file transfers
- Tracks transfer progress and status
- Provides transfer history and cleanup

## Integration with Frontend

The backend integrates with the frontend through:

1. **User Authentication**: Uses Google OAuth user info to generate consistent user hashes
2. **Device Detection**: Automatically detects device capabilities and information
3. **WebSocket Connection**: Maintains real-time connection for device updates
4. **File Sharing**: Enables direct file transfer between user's devices

## Security

- CORS configured for frontend domain
- User authentication through Google OAuth
- Device-specific hashing for user identification
- WebSocket connection validation
- File transfer validation and error handling

## Development

### Project Structure

```
src/
├── app.module.ts          # Main application module
├── main.ts               # Application entry point
├── device/               # Device management
│   ├── device.controller.ts
│   ├── device.service.ts
│   ├── device.gateway.ts
│   ├── device.interface.ts
│   └── device.module.ts
└── file-transfer/        # File transfer management
    ├── file-transfer.controller.ts
    ├── file-transfer.service.ts
    └── file-transfer.module.ts
```

### Build

```bash
# Build for production
pnpm run build

# Run built application
pnpm run start:prod
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run tests with coverage
pnpm run test:cov

# Run end-to-end tests
pnpm run test:e2e
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `WS_PORT` - WebSocket port (default: same as PORT)
