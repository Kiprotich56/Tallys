import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.session?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

/**
 * Allows admins through unconditionally; otherwise requires the authenticated
 * user's session customerId to match the numeric customerId returned by
 * `getOwnerCustomerId(req)`. Use for any resource keyed by customerId
 * (appointments, customer profile/notes, etc.) to prevent IDOR access.
 */
export function requireOwnerOrAdmin(
  getOwnerCustomerId: (req: Request) => number | null | undefined | Promise<number | null | undefined>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (req.session.role === "admin") {
      next();
      return;
    }
    try {
      const ownerCustomerId = await getOwnerCustomerId(req);
      if (ownerCustomerId == null || req.session.customerId !== ownerCustomerId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
