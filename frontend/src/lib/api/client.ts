import { SESSION_TOKEN_HEADER, SESSION_TOKEN_WINDOW_KEY } from "shared";

export function readTokenFrom(source: Record<string, unknown> | undefined): string | null {
	if (!source) return null;
	const token = source[SESSION_TOKEN_WINDOW_KEY];
	return typeof token === "string" ? token : null;
}

export function getSessionToken(): string | null {
	if (typeof window === "undefined") return null;
	return readTokenFrom(window as unknown as Record<string, unknown>);
}

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
		this.name = "ApiError";
	}
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const token = getSessionToken();
	const headers = new Headers(init.headers);
	if (token) {
		headers.set(SESSION_TOKEN_HEADER, token);
	}
	if (init.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(path, { ...init, headers });
	if (!response.ok) {
		throw new ApiError(`Request to ${path} failed with ${response.status}`, response.status);
	}
	return (await response.json()) as T;
}
