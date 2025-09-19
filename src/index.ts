import { DurableObject } from 'cloudflare:workers';

interface ChatMessage {
	message: string;
	name: string;
	timestamp?: number;
}

// Durable Object class - this handles state and WebSocket connections for each chat room
export class Chat extends DurableObject<Env> {
	// Handle HTTP requests - in this case, WebSocket upgrade requests
	async fetch(request: Request) {
		const url = new URL(request.url);

		// Check if this is a WebSocket upgrade request
		if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
			// Create WebSocket pair - one for Durable Object, one for client
			const pair = new WebSocketPair();

			// Accept the WebSocket connection in the Durable Object
			this.ctx.acceptWebSocket(pair[0]);

			// Get username from URL parameters with validation
			const name = url.searchParams.get('name')?.trim() || 'Anonymous';

			// Store user info with WebSocket for later retrieval
			pair[0].serializeAttachment({ name });

			// Notify other users that someone joined
			this.broadcast({ message: 'Connected', name }, pair[0]);

			// Send chat history to new user (simplified approach)
			await this.sendChatHistory(pair[0]);

			// Return the other end of WebSocket pair to client
			return new Response(null, { status: 101, webSocket: pair[1] });
		}

		return new Response('Not Found', { status: 404 });
	}

	// Handle incoming WebSocket messages
	async webSocketMessage(ws: WebSocket, data: string) {
		try {
			const parsed = JSON.parse(data);
			const { message } = parsed;

			// Validate message content
			if (!message || typeof message !== 'string' || message.trim().length === 0) {
				return; // Ignore empty messages
			}

			// Get user info from WebSocket attachment
			const { name } = ws.deserializeAttachment();

			// Create message object with timestamp
			const chatMessage: ChatMessage = {
				message: message.trim(),
				name,
				timestamp: Date.now()
			};

			// Store message in Durable Object storage
			this.ctx.storage.kv.put(`msg_${chatMessage.timestamp}`, chatMessage);

			// Broadcast to all OTHER connected clients (not sender)
			this.broadcast(chatMessage, ws);
		} catch (error) {
			console.error('Error processing message:', error);
		}
	}

	// Handle WebSocket disconnections
	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		try {
			const { name } = ws.deserializeAttachment();
			// Notify other users that someone left
			this.broadcast({ message: 'Disconnected', name }, ws);
		} catch (error) {
			console.error('Error handling disconnect:', error);
		}
	}

	// Handle WebSocket errors
	webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
		console.error('WebSocket error:', error);
		// Could add additional error handling/logging here
	}

	// Send chat history to a newly connected user
	private async sendChatHistory(ws: WebSocket) {
		// Get all stored messages (simplified from complex async iteration)
		const messages = this.ctx.storage.kv.list({ prefix: 'msg_' });

		// Send each message to the new user
		for (const [_, messageData] of messages) {
			const message = messageData as ChatMessage;
			ws.send(JSON.stringify({ message: message.message, name: message.name, timestamp: message.timestamp }));
		}
	}

	// Broadcast message to all connected clients except sender
	private broadcast(data: ChatMessage, self: WebSocket) {
		// Get all WebSocket connections for this Durable Object
		for (const ws of this.ctx.getWebSockets()) {
			// Don't send message back to sender
			if (ws === self) continue;

			// Send message to other clients
			try {
				ws.send(JSON.stringify({ message: data.message, name: data.name, timestamp: data.timestamp }));
			} catch (error) {
				console.error('Error broadcasting to client:', error);
			}
		}
	}
}

// Main Worker - routes requests to appropriate Durable Objects
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Get room name from URL parameters (creates separate chat rooms)
		const room = url.searchParams.get('room') || 'default';

		// Get Durable Object instance for this room
		// Each room gets its own isolated Durable Object with its own state
		const chatRoom = env.Chat.idFromName(room);
		const chat = env.Chat.get(chatRoom);

		// Forward request to the Durable Object
		return chat.fetch(request);
	},
};
