export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: {
    code: string;
    message: string;
    spokenMessage: string;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (data && typeof data === 'object' && data.ok === true && data.data === undefined) {
      data.data = { ...data };
    }
    return data as ApiResponse<T>;
  } catch (err: any) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network request failed',
        spokenMessage: 'Internet ya server mein samasya hai.',
      },
    };
  }
}

