import { Actor, ActorConfiguration, handler } from '@cloudflare/actors';

export class Chat extends Actor<Env> {
	static configuration: (request: Request) => ActorConfiguration = (request) => {
		return {
			sockets: {
				upgradePath: '/ws',
				autoResponse: {
					ping: 'pong',
					pong: 'ping',
				},
			},
		};
	};

	protected shouldUpgradeSocket(request: Request): boolean {
		return true;
	}

	protected onSocketConnect(ws: WebSocket, request: Request) {
		const url = new URL(request.url);
		console.log('Socket connected', url.searchParams.get('name'));
	}

	protected onSocketDisconnect(ws: WebSocket) {
		console.log('Socket disconnected');
	}

	protected onSocketMessage(ws: WebSocket, data: any) {
		const parsed = JSON.parse(data);
		const name = ws.deserializeAttachment().queryParams.name;
		this.sockets.message(JSON.stringify({ name, ...parsed }), '*', [ws]);
	}
}

export default handler(Chat);
