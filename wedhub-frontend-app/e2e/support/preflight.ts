const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Fails fast with a clear message rather than a wall of confusing timeouts if the backend isn't up. */
export async function assertBackendIsRunning(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const json = (await response.json()) as { data?: { status?: string } };
    if (json.data?.status !== "healthy") {
      throw new Error(`Backend at ${API_URL} responded but is not healthy: ${JSON.stringify(json)}`);
    }
  } catch (error) {
    throw new Error(
      `Backend is not reachable at ${API_URL}. Start it first: cd wedhub-backend && npm run dev\n` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
