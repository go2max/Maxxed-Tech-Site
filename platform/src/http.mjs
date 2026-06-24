export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export function html(markup, init = {}) {
  return new Response(markup, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export function readCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const prefix = `${name}=`;
  for (const part of cookie.split(/;\s*/)) {
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }
  return null;
}

export function appendSecurityHeaders(response, requestId, hstsEnabled) {
  response.headers.set("x-request-id", requestId);
  response.headers.set("content-security-policy", "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; form-action 'self'");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), usb=()");
  if (hstsEnabled) {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
}
