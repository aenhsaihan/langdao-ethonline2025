# LangDAO Backend

Backend service for the LangDAO matching system that handles real-time tutor-student pairing.

## Features

- **Real-time Matching**: WebSocket-based matching system
- **Tutor Availability**: Track and manage tutor availability
- **Student Requests**: Handle student requests for tutors
- **Smart Contract Integration**: Connect with LangDAO.sol for session management
- **REST API**: RESTful endpoints for frontend integration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Smart Contract│
│   (Next.js)     │◄──►│   (Node.js)      │◄──►│   (LangDAO.sol) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   WebSocket     │    │   In-Memory      │
│   (Real-time)   │    │   (Session State)│
└─────────────────┘    └──────────────────┘
```

## Setup

1. **Install dependencies**:

   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server**:

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Tutors

- `GET /api/tutors/available` - Get all available tutors
- `GET /api/tutors/:address` - Get tutor information
- `GET /api/tutors/:address/availability` - Check tutor availability

### Students

- `GET /api/students/:address` - Get student information
- `POST /api/students/:address/validate-budget` - Validate budget

### Matching

- `POST /api/matching/find-tutors` - Find matching tutors
- `GET /api/matching/stats` - Get matching statistics

## WebSocket Events

### Tutor Events

- `tutor:set-available` - Mark tutor as available
- `tutor:set-unavailable` - Mark tutor as unavailable
- `tutor:incoming-request` - Receive student request
- `tutor:respond-to-request` - Respond to student request

### Student Events

- `student:request-tutor` - Request a tutor
- `student:select-tutor` - Select a responding tutor
- `student:tutor-response` - Receive tutor response

## Matching Flow

1. **Tutor goes online** → `tutor:set-available`
2. **Student requests tutor** → `student:request-tutor`
3. **Matching tutors notified** → `tutor:incoming-request`
4. **Tutors respond** → `tutor:respond-to-request`
5. **Student sees responses** → `student:tutor-response`
6. **Student selects tutor** → `student:select-tutor`
7. **Session starts** → Smart contract transaction

## Environment Variables

- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- `RPC_URL` - Blockchain RPC URL
- `CONTRACT_ADDRESS` - LangDAO contract address
- `REDIS_URL` - Redis URL (for production)

## Development

The backend uses:

- **Express.js** for REST API
- **Socket.io** for WebSocket connections
- **Ethers.js** for blockchain interaction
- **In-memory storage** for development (Redis for production)
