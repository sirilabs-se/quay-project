import { randomBytes } from "node:crypto";
import { createQuayServer } from "./server.js";
import type { AuthConfig } from "./middleware/auth.js";

const PORT = Number(process.env.QUAY_PORT ?? 4317);
const HOST = "127.0.0.1";

const token = randomBytes(32).toString("hex");

const config: AuthConfig = {
	token,
	allowedHosts: [`127.0.0.1:${PORT}`, `localhost:${PORT}`],
	allowedOrigins: [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]
};

const server = createQuayServer(config);

server.listen(PORT, HOST, () => {
	console.log(`Quay backend listening on http://${HOST}:${PORT}`);
	console.log(`Session token: ${token}`);
});
