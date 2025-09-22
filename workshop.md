# Building Real-Time Chat with Cloudflare Durable Objects

## 🚀 A Step-by-Step Workshop (50 minutes)

Welcome to this hands-on workshop where you'll build a real-time chat application from scratch using Cloudflare Durable Objects and Workers!

## 🎯 What You'll Build

By the end of this workshop, you'll have created:

- A **real-time chat application** that runs globally on Cloudflare's edge
- **Multi-room chat** with persistent message history
- **WebSocket-based** real-time communication
- **Serverless architecture** with state management

## ⏱️ Timeline Overview (50 minutes)

- **Setup & Overview** (5 minutes) - Project initialization
- **Frontend Setup** (10 minutes) - Creating the chat interface
- **Durable Object Basics** (10 minutes) - Building the chat room
- **WebSocket Implementation** (15 minutes) - Real-time messaging
- **Message Persistence** (5 minutes) - Adding storage
- **Testing & Enhancement** (5 minutes) - Testing and improvements

---

## 🏁 Step 1: Project Setup (5 minutes)

### Initialize Your Project

Create a new directory and initialize the project:

```bash
mkdir hello-chat
cd hello-chat
npm init -y
```

### Install Dependencies

```bash
npm install --save-dev wrangler typescript @cloudflare/vitest-pool-workers vitest
```

### Create Configuration Files

**Create `wrangler.jsonc`:**

```jsonc
{
	"name": "hello-chat",
	"main": "src/index.ts",
	"compatibility_date": "2024-03-01",
	"durable_objects": {
		"bindings": [
			{
				"name": "Chat",
				"class_name": "Chat"
			}
		]
	},
	"assets": {
		"directory": "./public/"
	}
}
```

**Create `tsconfig.json`:**

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ES2022",
		"lib": ["ES2022"],
		"types": ["@cloudflare/workers-types"],
		"moduleResolution": "bundler",
		"allowSyntheticDefaultImports": true,
		"esModuleInterop": true,
		"strict": true
	}
}
```

**Update `package.json` scripts:**

```json
{
	"scripts": {
		"dev": "wrangler dev",
		"deploy": "wrangler deploy",
		"test": "vitest"
	}
}
```

### Create Folder Structure

```bash
mkdir src public
touch src/index.ts public/index.html
```

---

## 🎨 Step 2: Frontend Setup (10 minutes)

We'll provide you with a complete frontend. Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Real-Time Chat</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				max-width: 800px;
				margin: 0 auto;
				padding: 20px;
				background-color: #f5f5f5;
			}
			.chat-container {
				background: white;
				border-radius: 8px;
				padding: 20px;
				box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
			}
			#connectionStatus {
				padding: 10px;
				border-radius: 4px;
				margin-bottom: 10px;
				font-weight: bold;
			}
			.connected {
				background-color: #d4edda;
				color: #155724;
			}
			.disconnected {
				background-color: #f8d7da;
				color: #721c24;
			}
			#messageContainer {
				border: 1px solid #ddd;
				height: 400px;
				overflow-y: auto;
				padding: 15px;
				margin: 15px 0;
				background-color: #fafafa;
				border-radius: 4px;
			}
			.message {
				margin: 5px 0;
				padding: 8px;
				border-radius: 4px;
				background-color: white;
				border-left: 3px solid #007bff;
			}
			.system-message {
				background-color: #e9ecef;
				border-left: 3px solid #6c757d;
				font-style: italic;
			}
			.error-message {
				background-color: #f8d7da;
				border-left: 3px solid #dc3545;
				color: #721c24;
			}
			form {
				display: flex;
				gap: 10px;
				align-items: center;
			}
			#messageInput {
				flex: 1;
				padding: 10px;
				border: 1px solid #ddd;
				border-radius: 4px;
				font-size: 16px;
			}
			button {
				padding: 10px 20px;
				border: none;
				border-radius: 4px;
				cursor: pointer;
				font-size: 16px;
			}
			#sendButton {
				background-color: #007bff;
				color: white;
			}
			#sendButton:disabled {
				background-color: #6c757d;
				cursor: not-allowed;
			}
			.disconnect-btn {
				background-color: #dc3545;
				color: white;
			}
			.room-info {
				background-color: #e7f3ff;
				padding: 10px;
				border-radius: 4px;
				margin-bottom: 15px;
				border: 1px solid #b8daff;
			}
		</style>
	</head>
	<body>
		<div class="chat-container">
			<h1>🚀 Real-Time Chat</h1>

			<div class="room-info">
				<strong>Room:</strong> <span id="roomId"></span><br />
				<strong>User:</strong> <span id="userName"></span>
			</div>

			<div id="connectionStatus" class="disconnected">Status: Disconnected</div>

			<div id="messageContainer"></div>

			<form onsubmit="sendMessage(event)">
				<input type="text" id="messageInput" placeholder="Type your message..." maxlength="200" required />
				<button type="submit" id="sendButton" disabled>Send</button>
				<button type="button" class="disconnect-btn" onclick="disconnect()">Disconnect</button>
			</form>
		</div>

		<script>
			// Room and user setup
			const url = new URL(window.location.href);
			let room = url.searchParams.get('room');

			if (!room) {
				room = Math.random().toString(36).substring(2, 15);
				url.searchParams.set('room', room);
				history.replaceState(null, '', url.href);
			}

			let username;
			do {
				username = prompt('Enter your username (3-20 characters):');
				if (username === null) {
					username = 'Anonymous';
					break;
				}
				username = username.trim();
			} while (username.length < 3 || username.length > 20);

			document.getElementById('roomId').textContent = room;
			document.getElementById('userName').textContent = username;

			// WebSocket setup
			let ws;
			const messageContainer = document.getElementById('messageContainer');
			const statusElement = document.getElementById('connectionStatus');
			const sendButton = document.getElementById('sendButton');

			function connect() {
				const wsUrl = location.origin.replace(/^http/, 'ws') + '/ws';
				const connectionUrl = `${wsUrl}?name=${encodeURIComponent(username)}&room=${encodeURIComponent(room)}`;
				ws = new WebSocket(connectionUrl);

				ws.onopen = () => {
					statusElement.textContent = 'Status: Connected';
					statusElement.className = 'connected';
					sendButton.disabled = false;
					addMessage('System', `Connected to room ${room} as ${username}`, true);
				};

				ws.onmessage = (event) => {
					try {
						const { name, message, timestamp } = JSON.parse(event.data);
						addMessage(name, message, false, timestamp);
					} catch (error) {
						addMessage('Error', 'Received invalid message', true);
					}
				};

				ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					addMessage('Error', 'Connection error occurred', true);
				};

				ws.onclose = (event) => {
					statusElement.textContent = 'Status: Disconnected';
					statusElement.className = 'disconnected';
					sendButton.disabled = true;
					addMessage('System', `Disconnected (Code: ${event.code})`, true);

					if (event.code !== 1000) {
						setTimeout(() => {
							addMessage('System', 'Attempting to reconnect...', true);
							connect();
						}, 3000);
					}
				};
			}

			function sendMessage(evt) {
				evt.preventDefault();

				const messageInput = document.getElementById('messageInput');
				const message = messageInput.value.trim();

				if (!message || !ws || ws.readyState !== WebSocket.OPEN) {
					return;
				}

				try {
					ws.send(JSON.stringify({ message }));
					addMessage(username + ' (you)', message, false);
					messageInput.value = '';
				} catch (error) {
					addMessage('Error', 'Failed to send message', true);
				}
			}

			function disconnect() {
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.close(1000, 'User initiated disconnect');
				}
			}

			function addMessage(source, message, isSystem = false, serverTimestamp = null) {
				const messageElement = document.createElement('div');
				messageElement.className = 'message';

				if (isSystem || source === 'System' || source === 'Error') {
					messageElement.className += source === 'Error' ? ' error-message' : ' system-message';
				}

				const timestamp = serverTimestamp ? new Date(serverTimestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

				messageElement.innerHTML = `<strong>[${timestamp}] ${source}:</strong> ${message}`;
				messageContainer.appendChild(messageElement);
				messageContainer.scrollTop = messageContainer.scrollHeight;

				// Limit message history
				if (messageContainer.children.length > 100) {
					messageContainer.removeChild(messageContainer.firstChild);
				}
			}

			// Initialize
			connect();
		</script>
	</body>
</html>
```

**🎯 Frontend Complete!** Your chat interface is ready. Now let's build the backend!

---

## 🏗️ Step 3: Durable Object Basics (10 minutes)

Let's start building our backend! Create the basic structure in `src/index.ts`:

### Define Types

```typescript
import { DurableObject } from 'cloudflare:workers';

interface ChatMessage {
	message: string;
	name: string;
	timestamp?: number;
}

interface Env {
	Chat: DurableObjectNamespace;
}
```

### Create the Chat Durable Object Class

```typescript
export class Chat extends DurableObject<Env> {
	async fetch(request: Request) {
		const url = new URL(request.url);

		// Handle WebSocket upgrade requests
		if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
			// Get username from URL parameters
			const name = url.searchParams.get('name')?.trim() || 'Anonymous';
			return this.handleWebSocketUpgrade(request, name);
		}

		return new Response('Not Found', { status: 404 });
	}

	private async handleWebSocketUpgrade(request: Request, name: string) {
		// Create WebSocket pair
		const pair = new WebSocketPair();

		// Accept the WebSocket in the Durable Object
		this.ctx.acceptWebSocket(pair[0]);

		// Store user info with WebSocket
		pair[0].serializeAttachment({ name });

		// Notify others that someone joined
		this.broadcast({ message: 'joined the chat', name }, pair[0]);

		// Send chat history to new user
		await this.sendChatHistory(pair[0]);

		// Return the other end to client
		return new Response(null, { status: 101, webSocket: pair[1] });
	}

	private broadcast(data: ChatMessage, excludeWs?: WebSocket) {
		const message = JSON.stringify({
			message: data.message,
			name: data.name,
			timestamp: data.timestamp,
		});

		for (const ws of this.ctx.getWebSockets()) {
			if (ws !== excludeWs) {
				try {
					ws.send(message);
				} catch (error) {
					console.error('Error broadcasting:', error);
				}
			}
		}
	}

	private async sendChatHistory(ws: WebSocket) {
		// We'll implement this in the next step
		console.log('Sending chat history...');
	}
}
```

### Add the Worker (Router)

```typescript
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Get room name from parameters
		const room = url.searchParams.get('room') || 'default';

		// Get Durable Object instance for this room
		const chatRoom = env.Chat.idFromName(room);
		const chat = env.Chat.get(chatRoom);

		// Forward request to Durable Object
		return chat.fetch(request);
	},
};
```

**🎯 Test Point:** Run `npm run dev` and test the connection in your browser!

---

## 💬 Step 4: WebSocket Message Handling (15 minutes)

Now let's add the core messaging functionality. Add these methods to your `Chat` class:

### Handle Incoming Messages

```typescript
async webSocketMessage(ws: WebSocket, data: string) {
    try {
        const parsed = JSON.parse(data);
        const { message } = parsed;

        // Validate message
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return;
        }

        // Get user info
        const { name } = ws.deserializeAttachment();

        // Create message object
        const chatMessage: ChatMessage = {
            message: message.trim(),
            name,
            timestamp: Date.now()
        };

        // Store message (we'll implement this next)
        await this.storeMessage(chatMessage);

        // Broadcast to others
        this.broadcast(chatMessage, ws);

    } catch (error) {
        console.error('Error processing message:', error);
    }
}
```

### Handle Disconnections

```typescript
webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    try {
        const { name } = ws.deserializeAttachment();
        this.broadcast({ message: 'left the chat', name }, ws);
    } catch (error) {
        console.error('Error handling disconnect:', error);
    }
}

webSocketError(ws: WebSocket, error: unknown) {
    console.error('WebSocket error:', error);
}
```

### Add Storage Helper Method

```typescript
private async storeMessage(message: ChatMessage) {
    // Store message with timestamp as key
    const key = `msg_${message.timestamp}`;
    await this.ctx.storage.put(key, message);
}
```

**🎯 Test Point:** Your chat should now handle real-time messaging between users!

---

## 💾 Step 5: Message Persistence (5 minutes)

Let's implement message history so new users can see previous messages:

### Update the sendChatHistory Method

Replace the placeholder method with:

```typescript
private async sendChatHistory(ws: WebSocket) {
    try {
        // Get all stored messages
        const messages = await this.ctx.storage.list({ prefix: 'msg_' });

        // Send each message to the new user
        for (const [_, messageData] of messages) {
            const message = messageData as ChatMessage;
            ws.send(JSON.stringify({
                message: message.message,
                name: message.name,
                timestamp: message.timestamp
            }));
        }
    } catch (error) {
        console.error('Error sending chat history:', error);
    }
}
```

**🎯 Test Point:**

1. Send some messages
2. Refresh your browser
3. You should see message history load!

---

## 🧪 Step 6: Testing & Enhancement (5 minutes)

### Complete Code Check

Your final `src/index.ts` should look like this:

```typescript
import { DurableObject } from 'cloudflare:workers';

interface ChatMessage {
	message: string;
	name: string;
	timestamp?: number;
}

interface Env {
	Chat: DurableObjectNamespace;
}

export class Chat extends DurableObject<Env> {
	async fetch(request: Request) {
		const url = new URL(request.url);

		if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
			return this.handleWebSocketUpgrade(request, url);
		}

		return new Response('Not Found', { status: 404 });
	}

	private async handleWebSocketUpgrade(request: Request, url: URL) {
		const pair = new WebSocketPair();
		this.ctx.acceptWebSocket(pair[0]);

		const name = url.searchParams.get('name')?.trim() || 'Anonymous';
		pair[0].serializeAttachment({ name });

		this.broadcast({ message: 'joined the chat', name }, pair[0]);
		await this.sendChatHistory(pair[0]);

		return new Response(null, { status: 101, webSocket: pair[1] });
	}

	async webSocketMessage(ws: WebSocket, data: string) {
		try {
			const parsed = JSON.parse(data);
			const { message } = parsed;

			if (!message || typeof message !== 'string' || message.trim().length === 0) {
				return;
			}

			const { name } = ws.deserializeAttachment();

			const chatMessage: ChatMessage = {
				message: message.trim(),
				name,
				timestamp: Date.now(),
			};

			await this.storeMessage(chatMessage);
			this.broadcast(chatMessage, ws);
		} catch (error) {
			console.error('Error processing message:', error);
		}
	}

	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		try {
			const { name } = ws.deserializeAttachment();
			this.broadcast({ message: 'left the chat', name }, ws);
		} catch (error) {
			console.error('Error handling disconnect:', error);
		}
	}

	webSocketError(ws: WebSocket, error: unknown) {
		console.error('WebSocket error:', error);
	}

	private async storeMessage(message: ChatMessage) {
		const key = `msg_${message.timestamp}`;
		await this.ctx.storage.put(key, message);
	}

	private async sendChatHistory(ws: WebSocket) {
		try {
			const messages = await this.ctx.storage.list({ prefix: 'msg_' });

			for (const [_, messageData] of messages) {
				const message = messageData as ChatMessage;
				ws.send(
					JSON.stringify({
						message: message.message,
						name: message.name,
						timestamp: message.timestamp,
					})
				);
			}
		} catch (error) {
			console.error('Error sending chat history:', error);
		}
	}

	private broadcast(data: ChatMessage, excludeWs?: WebSocket) {
		const message = JSON.stringify({
			message: data.message,
			name: data.name,
			timestamp: data.timestamp,
		});

		for (const ws of this.ctx.getWebSockets()) {
			if (ws !== excludeWs) {
				try {
					ws.send(message);
				} catch (error) {
					console.error('Error broadcasting:', error);
				}
			}
		}
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const room = url.searchParams.get('room') || 'default';

		const chatRoom = env.Chat.idFromName(room);
		const chat = env.Chat.get(chatRoom);

		return chat.fetch(request);
	},
};
```

### Testing Checklist

✅ **Single User Test:**

- Open your app at `http://localhost:8787`
- Send messages to yourself
- Check that messages appear immediately

✅ **Multi-User Test:**

- Open multiple browser tabs with the same URL
- Send messages from different tabs
- Verify real-time message delivery

✅ **Room Isolation Test:**

- Open tabs with different `?room=` parameters
- Verify messages don't cross between rooms

✅ **Persistence Test:**

- Send messages, refresh page
- Check that message history loads

### 🚀 Deploy to Cloudflare

```bash
# Deploy your chat app
npm run deploy

# Your app will be available at:
# https://hello-chat.YOUR-SUBDOMAIN.workers.dev
```

---

## 🎉 Congratulations

You've successfully built a real-time chat application with:

- ✅ **Real-time messaging** with WebSockets
- ✅ **Multi-room support** with isolated state
- ✅ **Message persistence** across sessions
- ✅ **Global deployment** on Cloudflare's edge
- ✅ **Automatic scaling** with Durable Objects

## 🔧 Optional Enhancements (If Time Permits)

### Add User Count

Track online users in your Durable Object:

```typescript
// Add to Chat class
private connectedUsers = new Set<string>();

// In handleWebSocketUpgrade
this.connectedUsers.add(name);
this.broadcastUserCount();

// In webSocketClose
this.connectedUsers.delete(name);
this.broadcastUserCount();

private broadcastUserCount() {
    this.broadcast({
        message: `${this.connectedUsers.size} users online`,
        name: 'System'
    });
}
```

### Add Message Validation

Implement rate limiting and content filtering:

```typescript
// Add rate limiting
const lastMessage = await this.ctx.storage.get(`lastMsg_${name}`);
const now = Date.now();
if (lastMessage && now - lastMessage < 1000) {
	return; // Rate limited
}
await this.ctx.storage.put(`lastMsg_${name}`, now);
```

## 📚 Key Concepts Learned

- **Durable Objects** provide consistent, stateful compute at the edge
- **WebSocket management** in serverless environments
- **Room-based architecture** with isolated state per object
- **Message persistence** with automatic storage APIs
- **Global deployment** with edge computing

## 🎯 Next Steps

- Explore [Cloudflare D1](https://developers.cloudflare.com/d1/) for more complex data needs
- Add [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) for authentication
- Implement file sharing with [Cloudflare R2](https://developers.cloudflare.com/r2/)
- Add [Cloudflare Analytics](https://developers.cloudflare.com/analytics/) for insights

Great job building your real-time chat application! 🚀
