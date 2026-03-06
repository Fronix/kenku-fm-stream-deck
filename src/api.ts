export let remoteAddress = "127.0.0.1";
export let remotePort = "3333";

export function setRemoteAddress(address: string): void {
  remoteAddress = address;
}

export function setRemotePort(port: string): void {
  remotePort = port;
}

export async function api<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: Record<string, unknown>,
  version = "v1",
): Promise<T> {
  const response = await fetch(
    `http://${remoteAddress}:${remotePort}/${version}/${path}`,
    {
      method,
      body: method === "GET" ? undefined : JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) throw new Error(response.statusText);
  return response.json() as Promise<T>;
}
