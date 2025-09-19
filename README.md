# Cloudflare Durable Objects Chat Workshop

Welcome to the Cloudflare Durable Objects Chat Workshop! In this hands-on session, you'll build a real-time chat application using Cloudflare Workers and Durable Objects.

## 🎯 Learning Objectives

By the end of this workshop, you will understand:

- **Cloudflare Durable Objects** fundamentals and use cases
- **WebSocket management** in a serverless environment
- **State persistence** and data storage with Durable Objects
- **Real-time communication** patterns in distributed systems
- **Room-based chat architecture** and user session management

## 📋 Prerequisites

### Required Knowledge
- Basic JavaScript/TypeScript understanding
- Familiarity with HTML and CSS
- Basic understanding of WebSockets (helpful but not required)

### Required Tools
- **Node.js** (v20 or later)
- **npm** or **yarn**
- **Cloudflare account** (free tier is sufficient)
- **Code editor** (VS Code recommended)
- **Modern web browser**

### Setup Before Workshop
1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

3. Clone this repository:
   ```bash
   git clone <repository-url>
   cd hello-chat
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

## 🏗️ Architecture Overview

Our chat application consists of:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Cloudflare      │    │ Durable Object  │
│   (HTML/JS)     │◄──►│  Worker          │◄──►│ (Chat Room)     │
│                 │    │  (Router)        │    │                 │
│  • WebSocket    │    │  • Route to DO   │    │ • WebSocket     │
│  • User Input   │    │  • Handle rooms  │    │ • Message Store │
│  • Message UI   │    │                  │    │ • Broadcasting  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Key Concepts:**
- **Worker**: Routes requests and creates Durable Object instances
- **Durable Object**: Manages state and WebSocket connections for each chat room
- **WebSockets**: Enable real-time bidirectional communication
- **Rooms**: Isolated chat spaces with their own Durable Object instance

## 🚀 Workshop Steps

### Step 1: Understanding the Project Structure

Let's explore the key files:

```
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
        "name": "Chat",           // Binding name in Worker
        "class_name": "Chat"      // Durable Object class
      }
    ]
  },
  "assets": {
    "directory": "./public/"     // Static files served
  }
}
```

### Step 2: Durable Objects Deep Dive

Open `src/index.ts` and examine the architecture:

#### 2.1 The Chat Durable Object Class

```typescript
export class Chat extends DurableObject<Env> {
  // Handles HTTP requests (WebSocket upgrades)
  async fetch(request: Request) { ... }

  // Handles incoming WebSocket messages
  async webSocketMessage(ws: WebSocket, data: string) { ... }

  // Handles WebSocket disconnections
  webSocketClose(ws: WebSocket, ...) { ... }
}
```

**Key Concepts Explained:**

1. **Each room = One Durable Object instance**
   - Isolated state and connections
   - Automatic geographic distribution
   - Consistent storage and compute

2. **WebSocket Lifecycle Management**
   - `acceptWebSocket()`: Accept connection in DO
   - `serializeAttachment()`: Store user data with connection
   - `deserializeAttachment()`: Retrieve user data

3. **Storage API**
   - `ctx.storage.put()`: Store messages persistently
   - `ctx.storage.list()`: Retrieve message history
   - Automatic consistency and durability

#### 2.2 The Worker (Router)

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const room = url.searchParams.get('room') || 'default';

    // Get Durable Object instance for this room
    const chatRoom = env.Chat.idFromName(room);
    const chat = env.Chat.get(chatRoom);

    return chat.fetch(request);
  }
}
```

**Key Points:**
- Workers are stateless and route requests
- `idFromName()` creates consistent IDs for room names
- Each room gets its own isolated Durable Object

### Step 3: Frontend Architecture

Open `public/index.html` and examine the client-side code:

#### 3.1 WebSocket Connection Setup
```javascript
// Convert HTTP URL to WebSocket URL
const wsUrl = location.origin.replace(/^http/, 'ws') + '/ws';

// Connect with room and username parameters
const connectionUrl = `${wsUrl}?name=${username}&room=${room}`;
ws = new WebSocket(connectionUrl);
```

#### 3.2 Message Flow
1. **User types message** → Frontend validation
2. **Send via WebSocket** → JSON payload to Durable Object
3. **Durable Object processes** → Store + broadcast to others
4. **Receive broadcasts** → Display in UI

#### 3.3 Room Management
```javascript
// Auto-generate room ID if not specified
if (!room) {
  room = generateRandomId();
  url.searchParams.set('room', room);
  history.replaceState(null, '', url.href);
}
```

### Step 4: Hands-On Development

Now let's build and modify the application together!

#### 4.1 Run the Development Server

```bash
# Start the development server
npm run dev
# or
wrangler dev
```

Visit `http://localhost:8787` to see your chat application.

#### 4.2 Test Basic Functionality

1. **Single User Test:**
   - Enter a username
   - Send a message to yourself
   - Observe message storage and display

2. **Multi-User Test:**
   - Open multiple browser tabs/windows
   - Join the same room (same URL)
   - Test real-time messaging

#### 4.3 Code Exploration Tasks

**Task 1: Message Timestamps**
Add server-side timestamps to messages:

In `src/index.ts`, modify the message storage:
```typescript
const chatMessage: ChatMessage = {
  message: message.trim(),
  name,
  timestamp: Date.now(),
  serverTime: new Date().toISOString() // Add this
};
```

Update the frontend to display server time.

**Task 2: User Count Feature**
Track and display connected users:

1. Add user tracking in Durable Object
2. Broadcast user count changes
3. Update frontend to show "X users online"

**Task 3: Message Persistence Exploration**
Test message persistence:

1. Send several messages
2. Refresh the page
3. Observe message history loading
4. Examine the storage keys in dev tools

### Step 5: Advanced Features (Optional)

If time permits, explore these advanced concepts:

#### 5.1 Rate Limiting
Add basic rate limiting to prevent spam:

```typescript
// In webSocketMessage method
const lastMessage = await this.ctx.storage.get(`lastMsg_${name}`);
const now = Date.now();
if (lastMessage && (now - lastMessage) < 1000) {
  return; // Rate limited
}
await this.ctx.storage.put(`lastMsg_${name}`, now);
```

#### 5.2 Private Messages
Extend the system to support private messaging between users.

#### 5.3 Room Management
Add features like:
- Room creation/deletion
- Room discovery
- Password-protected rooms

### Step 6: Deployment

Deploy your chat application to Cloudflare:

```bash
# Deploy to Cloudflare
npm run deploy

# Your app will be available at:
# https://hello-chat.<your-subdomain>.workers.dev
```

## 🔧 Troubleshooting

### Common Issues

**1. WebSocket Connection Failed**
- Check if Wrangler dev server is running
- Verify the WebSocket URL in browser dev tools
- Ensure proper error handling in both client and server

**2. Messages Not Persisting**
- Check storage key naming consistency
- Look for errors in Wrangler logs

**3. Users Not Seeing Each Other's Messages**
- Confirm users are in the same room (same URL)
- Check WebSocket broadcast logic
- Verify WebSocket connections are properly accepted

**4. TypeScript Errors**
- Ensure all dependencies are installed: `npm install`
- Check that `@cloudflare/workers-types` is in devDependencies

**5. Deployment Issues**
- Verify you're logged into Cloudflare: `wrangler whoami`
- Check your account has Workers enabled
- Ensure migrations are properly configured

### Debugging Tips

1. **Use Browser Dev Tools:**
   - Network tab: Monitor WebSocket connection
   - Console: Check for JavaScript errors
   - Application tab: Inspect WebSocket frames

2. **Wrangler Logs:**
   ```bash
   npx wrangler tail
   ```

3. **Local Development:**
   ```bash
   npm run dev
   ```

## 📚 Key Concepts Learned

### Durable Objects
- **Global Uniqueness**: Each object ID is globally unique
- **Geographic Distribution**: Objects run close to users
- **Consistency**: Strong consistency within each object
- **Persistence**: Automatic state preservation

### WebSocket Management
- **Connection Lifecycle**: Accept, message, close, error handling
- **Broadcasting**: Efficient message distribution
- **Session Management**: User data serialization

### Serverless Architecture
- **Stateless Workers**: Route requests efficiently
- **Stateful Objects**: Manage persistent connections and data
- **Auto-scaling**: Handle traffic spikes automatically

## 🚀 Next Steps

After this workshop, consider exploring:

1. **Advanced Durable Objects Features:**
   - Alarms for scheduled tasks
   - Cross-object communication
   - Storage transactions

2. **Production Considerations:**
   - Authentication and authorization
   - Rate limiting and abuse prevention
   - Monitoring and analytics
   - Error handling and recovery

3. **Extended Chat Features:**
   - File sharing and image uploads
   - Message reactions and threading
   - User presence indicators
   - Message search and history

4. **Integration Opportunities:**
   - Database integration (D1, external DBs)
   - External APIs and webhooks
   - Email notifications
   - Mobile app development

## 📖 Additional Resources

- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [WebSocket API Reference](https://developers.cloudflare.com/durable-objects/reference/websockets/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Examples](https://github.com/cloudflare/workers-examples)

## 🤝 Support

If you encounter issues during the workshop:

1. Check the troubleshooting section above
2. Ask the workshop instructor
3. Reference the detailed code comments in the source files
4. Visit the [Cloudflare Developer Discord](https://discord.gg/cloudflaredev)

---

**Happy coding! 🎉**

*This workshop demonstrates the power of edge computing with Cloudflare Durable Objects. You've built a real-time, globally distributed chat application that scales automatically and maintains state consistency.*
