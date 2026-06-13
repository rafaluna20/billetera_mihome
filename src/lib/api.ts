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

  const response = await fetch(`${ODOO_URL}${endpoint}`, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...rest,
  });

  if (!response.ok) {
    throw new Error(`Odoo API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
