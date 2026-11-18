import { NextResponse, type NextRequest } from 'next/server';
import { resolveTenantFromHost, resolveTenantFromSlug, DEFAULT_TENANT } from '@/lib/tenant-resolver';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const host = request.headers.get('host');

  // 1. Resolve tenant: priority goes to query param > host header
  const queryTenantSlug = searchParams.get('tenant') || searchParams.get('company');
  const tenant = queryTenantSlug
    ? resolveTenantFromSlug(queryTenantSlug)
    : resolveTenantFromHost(host);

  // 2. Prepare request headers with tenant intelligence
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-name', tenant.companyName);
  requestHeaders.set('x-tenant-short', tenant.shortName);
  requestHeaders.set('x-tenant-whitelabel', tenant.isWhiteLabel ? '1' : '0');

  // 3. Multi-Tenant Edge Routing:
  // If the request is on a carrier subdomain or custom domain (tenant is not default ruller-os):
  // When hitting root '/', rewrite to '/quote' so shippers immediately see the branded booking portal
  const isCarrierDomain = tenant.slug !== DEFAULT_TENANT.slug;

  // Handle explicit /book route: e.g. /book or /book/pst
  if (pathname === '/book' || pathname.startsWith('/book/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/quote';
    
    // Extract slug from path if present: /book/pst
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      const explicitSlug = pathParts[1];
      url.searchParams.set('tenant', explicitSlug);
    } else if (isCarrierDomain) {
      url.searchParams.set('tenant', tenant.slug);
    }

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // If hitting root on a carrier branded subdomain/domain, rewrite to /quote
  if (pathname === '/' && isCarrierDomain) {
    const url = request.nextUrl.clone();
    url.pathname = '/quote';
    url.searchParams.set('tenant', tenant.slug);

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Pass-through with injected headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
