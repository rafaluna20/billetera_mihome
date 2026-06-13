export const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || "https://rel-odoo.ci5uw7.easypanel.host";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function fetchFromOdoo(endpoint: string, options: FetchOptions = {}) {
  const { token, headers, ...rest } = options;
  
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${ODOO_URL}${endpoint}`, {
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      signal: controller.signal,
      ...rest,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Odoo API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Odoo API Timeout: El servidor tardó demasiado en responder');
    }
    throw error;
  }

}
