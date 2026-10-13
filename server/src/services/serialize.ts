import type { Request } from 'express';
import type { Role } from '@career-log/shared';
import { User } from '../models/User';

export interface Viewer {
  id: string;
  role: Role;
  bookmarks: Set<string>;
}

export async function getViewer(req: Request): Promise<Viewer | undefined> {
  if (!req.user) return undefined;
  const user = await User.findById(req.user.id).select('bookmarks').lean();
  return {
    id: req.user.id,
    role: req.user.role,
    bookmarks: new Set((user?.bookmarks ?? []).map(String)),
  };
}

/**
 * Shapes an experience for the API. The author is always stored, but is hidden
 * from everyone except admins and the author when the post is anonymous.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeExperience(exp: any, viewer?: Viewer) {
  const { upvotes = [], reports = [], __v, ...rest } = exp;
  const authorId = String(exp.author?._id ?? exp.author);
  const isOwner = viewer?.id === authorId;
  const isAdmin = viewer?.role === 'admin';

  const out: Record<string, unknown> = {
    ...rest,
    isOwner,
    hasUpvoted: viewer ? upvotes.some((u: unknown) => String(u) === viewer.id) : false,
    isBookmarked: viewer ? viewer.bookmarks.has(String(exp._id)) : false,
  };

  if (exp.isAnonymous && !isOwner && !isAdmin) delete out.author;
  if (!isAdmin && !isOwner) delete out.reviewedBy;
  if (isAdmin) {
    out.reportCount = reports.length;
    out.reports = reports;
  }
  return out;
}
