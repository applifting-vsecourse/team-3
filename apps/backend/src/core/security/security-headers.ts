import helmet from 'helmet';

/**
 * helmet's headers, with a CSP limited to framing: the API returns JSON, and
 * the Swagger UI on this origin needs its inline scripts. HSTS stays on this
 * host, the subdomains aren't ours to decide for.
 */
export const securityHeaders = () =>
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
        frameAncestors: ["'none'"],
      },
    },
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: false },
  });
