import { DurableObject } from 'cloudflare:workers';

export class Chat extends DurableObject<Env> {
	async fetch(request: Request) {
		const url = new URL(request.url);
		if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
			const pair = new WebSocketPair();
			this.ctx.acceptWebSocket(pair[0]);
			const name = url.searchParams.get('name') ?? 'Anonymous';
			pair[0].serializeAttachment({ name });

			this.broadcast({ message: 'Connected', name }, pair[0]);

			// send messages back to the client
			for await (const [_, value] of this.ctx.storage.kv.list({ prefix: '' })) {
				const { message, name } = value as { message: string; name: string };
				pair[0].send(JSON.stringify({ message, name }));
			}

			return new Response(null, { status: 101, webSocket: pair[1] });
		}

		return new Response('Not Found', { status: 404 });
	}

	webSocketMessage(ws: WebSocket, data: string) {
		const { message } = JSON.parse(data);
		const { name } = ws.deserializeAttachment();
		this.ctx.storage.kv.put(Date.now().toString(), { message, name });
		this.broadcast({ message, name }, ws);
	}

	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		this.broadcast({ message: 'Disconnected', name: ws.deserializeAttachment().name }, ws);
	}

	webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
		console.error('WebSocket error:', error);
	}

	private broadcast(data: { message: string; name: string }, self: WebSocket) {
		for (const ws of this.ctx.getWebSockets()) {
			if (ws === self) continue;
			ws.send(JSON.stringify(data));
		}
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const room = url.searchParams.get('room');
		const chat = env.Chat.getByName(room ?? 'default');
		return chat.fetch(request);
	},
};
