import { Message, request, server, connection } from 'websocket';
import * as http from 'http'

export class Forwarder {
    private forwarderServer: server;

    constructor() {
        const httpServer = http.createServer((request, response) => {
            console.log((new Date()) + ' Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });

        httpServer.listen(9090, () => {
            console.log((new Date()) + ' Server is listening on port 9090');
        });

        this.forwarderServer = new server({
            httpServer,
            autoAcceptConnections: false
        })

        this.forwarderServer.on('request', (request) => this.httpRequest(request));
    }

    public broadcast(packet: object) {
        this.forwarderServer.broadcast(JSON.stringify(packet));
    }

    private originIsAllowed(origin: string) {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }

    private httpRequest(request: request) {
        if (!this.originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
            return;
        }

        console.log(request.requestedProtocols, request.origin);

        const connection = request.accept();
        connection.on('message', (message) => this.websocketMessage(connection, message));
        connection.on('close', () => {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });

        console.log((new Date()) + ' Connection accepted.');
    }

    private websocketMessage(connection: connection, message: Message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    }
}