# Hello Chat

A real-time chat application built with Cloudflare Workers and Durable Objects. This application demonstrates distributed state management at the edge with real-time WebSocket communication.

## 🚀 Features

- **Real-time messaging** with WebSocket connections
- **Room-based chat** with isolated conversations
- **Message persistence** using Durable Objects storage
- **Server-side timestamps** for consistent time display
- **Chat history** automatically loaded for new users
- **Multi-user support** with live message broadcasting

## 🏗️ Architecture

```ascii
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Cloudflare      │    │ Durable Object  │
│   (HTML/JS)     │◄──►│  Worker          │◄──►│ (Chat Room)     │
│                 │    │  (Router)        │    │                 │
│  • WebSocket    │    │  • Route to DO   │    │ • WebSocket     │
│  • User Input   │    │  • Handle rooms  │    │ • Message Store │
│  • Message UI   │    │                  │    │ • Broadcasting  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Components:**

- **Cloudflare Worker**: Routes requests and creates Durable Object instances for chat rooms
- **Durable Object**: Manages state and WebSocket connections for each individual chat room
- **WebSocket API**: Enables real-time bidirectional communication between clients and server
- **Room System**: Each room gets its own isolated Durable Object instance with persistent state

## Project Structure

```ascii
hello-chat/
├── src/
│   └── index.ts          # Durable Object and Worker code
├── public/
│   └── index.html        # Frontend chat interface
├── wrangler.jsonc        # Cloudflare configuration
└── package.json          # Dependencies
```

**Key Configuration (`wrangler.jsonc`):**

```jsonc
{
 "durable_objects": {
  "bindings": [
   {
    "name": "Chat", // Binding name in Worker
    "class_name": "Chat" // Durable Object class
   }
  ]
 },
 "assets": {
  "directory": "./public/" // Static files served
 }
}
```

## 🛠️ Technical Implementation

### Durable Object Architecture

The application uses a `Chat` Durable Object class that handles:

```typescript
export class Chat extends DurableObject<Env> {
  // Handles HTTP requests and WebSocket upgrades
  async fetch(request: Request) { ... }

  // Processes incoming WebSocket messages
  async webSocketMessage(ws: WebSocket, data: string) { ... }

  // Manages WebSocket disconnections
  webSocketClose(ws: WebSocket, ...) { ... }
}
```

**Key Features:**

- **Room Isolation**: Each chat room runs in its own Durable Object instance
- **Geographic Distribution**: Objects automatically run close to users
- **Persistent Storage**: Messages are stored using the Durable Objects storage API
- **WebSocket Management**: Handles connection lifecycle and message broadcasting
- **Server Timestamps**: All messages include consistent server-side timestamps

### Worker Routing

The Cloudflare Worker acts as a router:

```typescript
export default {
 async fetch(request: Request, env: Env, ctx: ExecutionContext) {
  const room = url.searchParams.get('room') || 'default';
  const chatRoom = env.Chat.idFromName(room);
  const chat = env.Chat.get(chatRoom);
  return chat.fetch(request);
 },
};
```

### Frontend Implementation

The client-side application features:

- **WebSocket Connection**: Establishes real-time communication with the Durable Object
- **Room Management**: Auto-generates room IDs or uses URL parameters
- **Message Display**: Shows chat history and real-time messages with timestamps
- **User Interface**: Clean, responsive design with message input and display areas

### Message Flow

1. User enters message in frontend
2. Message sent via WebSocket to Durable Object
3. Durable Object stores message with server timestamp
4. Message broadcast to all connected users in the room
5. Frontend displays message with consistent timestamp

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hello-chat
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   # or
   wrangler dev
   ```

4. **Open your browser**
   Visit `http://localhost:8787` to use the chat application

### Usage

1. **Enter your username** when prompted
2. **Join a room** by sharing the URL or using the auto-generated room ID
3. **Start chatting** - messages are delivered in real-time to all users in the room
4. **Message history** is automatically loaded when new users join

### Testing

**Multi-User Testing:**

- Open multiple browser tabs/windows
- Join the same room (same URL)
- Test real-time messaging between users

**Persistence Testing:**

- Send messages in a room
- Refresh the page or rejoin
- Observe chat history loading automatically

## 📦 Deployment

Deploy the chat application to Cloudflare:

```bash
# Login to Cloudflare (if not already logged in)
wrangler login

# Deploy to Cloudflare
npm run deploy
# or
wrangler deploy

# Your app will be available at:
# https://hello-chat.<your-subdomain>.workers.dev
```

## 🔧 Troubleshooting

### Common Issues

**WebSocket Connection Failed**

- Ensure Wrangler dev server is running
- Check WebSocket URL in browser dev tools
- Verify network connectivity and firewall settings

**Messages Not Persisting**

- Check Wrangler logs for storage errors
- Verify storage key consistency in code
- Ensure Durable Object is properly configured

**Users Can't See Each Other's Messages**

- Confirm users are in the same room (same URL)
- Check WebSocket connection status
- Verify broadcast logic in Durable Object

**Deployment Issues**

- Login check: `wrangler whoami`
- Verify Cloudflare account has Workers enabled
- Check wrangler.jsonc configuration

### Development Tools

**Browser Dev Tools:**

- Network tab: Monitor WebSocket connections
- Console: Check for JavaScript errors
- Application tab: Inspect WebSocket message frames

**Wrangler Commands:**

```bash
# View live logs
wrangler tail

# Local development
wrangler dev

# Check authentication
wrangler whoami
```

## 🏗️ Technical Details

### Durable Objects Benefits

- **Global Uniqueness**: Each room gets a globally unique object ID
- **Geographic Distribution**: Objects automatically run close to users
- **Strong Consistency**: Guaranteed consistency within each chat room
- **Automatic Persistence**: State and messages are automatically preserved

### WebSocket Implementation

- **Connection Management**: Proper lifecycle handling (connect, message, close, error)
- **Message Broadcasting**: Efficient distribution to all room participants
- **Session Data**: User information attached to WebSocket connections
- **Server Timestamps**: Consistent time display across all clients

### Serverless Architecture

- **Stateless Workers**: Efficiently route requests to appropriate Durable Objects
- **Stateful Objects**: Manage persistent connections and room data
- **Auto-scaling**: Automatically handle traffic spikes and geographic distribution

## 🔮 Potential Enhancements

The application can be extended with:

**Advanced Features:**

- User authentication and authorization
- Message reactions and threading
- File sharing and media uploads
- User presence indicators
- Message search and history
- Private messaging

**Production Features:**

- Rate limiting and abuse prevention
- Message moderation
- Analytics and monitoring
- Mobile app integration
- Database integration (D1, external databases)

**Scalability Features:**

- Cross-room communication
- Scheduled tasks with Durable Object alarms
- External API integrations
- Push notifications

## 📖 Additional Resources

- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [WebSocket API Reference](https://developers.cloudflare.com/durable-objects/reference/websockets/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Examples](https://github.com/cloudflare/workers-examples)
