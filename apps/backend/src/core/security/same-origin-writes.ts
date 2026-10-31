import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Writes to our own /api routes must come from our frontend (or the API's own
 * origin, e.g. Swagger UI). The session cookie is SameSite=Lax, which doesn't
 * help here: every team app lives on *.vsepractical.applifting.dev, the same
 * site, so a form on another team's app could POST to us with the user's
 * cookie (cancel an event, deactivate a group). Browsers send Origin with
 * every non-GET request, so the app itself is unaffected. BetterAuth checks
 * the Origin of /api/auth itself.
 */
export const sameOriginWrites = (allowedUrls: string[]) => {
  const allowed = new Set(allowedUrls.map((url) => new URL(url).origin));
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method) || req.path.startsWith('/api/auth/')) {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      next();
      return;
    }
    res.status(403).json({
      statusCode: 403,
      code: 'FOREIGN_ORIGIN',
      message: 'Požadavek nepřišel z HobbyHubu.',
    });
  };
};
