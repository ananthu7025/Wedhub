/**
 * Backend response shapes for the couples-only community module
 * (GET/POST /community/*, /admin/community/*) — mirrors reviews' and
 * wedding-stories' own types.ts split.
 */

export interface CommunityTag {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface CommunityAuthor {
  id: string;
  email: string;
  profile: { firstName: string | null; lastName: string | null } | null;
}

export interface CommunityPostMedia {
  id: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  originalObjectKey: string;
  blurDataUrl: string | null;
}

export type CommunityPostStatus = "VISIBLE" | "FLAGGED" | "HIDDEN";

export interface CommunityPost {
  id: string;
  authorUserId: string;
  tagId: string | null;
  title: string;
  body: string;
  status: CommunityPostStatus;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
  tag: CommunityTag | null;
  media: CommunityPostMedia[];
  // Only present when the request was made with a session — at most one
  // row (unique [postId, userId]) telling the frontend "you upvoted this"
  // without a separate per-post round trip.
  votes?: { id: string }[];
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorUserId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: CommunityAuthor;
  replies: CommunityComment[];
}

// ---- POST /community/posts ----
export interface CreateCommunityPostBody {
  tagId?: string;
  title: string;
  body: string;
  mediaId?: string;
}

// ---- POST /community/posts/:id/vote ----
export interface ToggleVoteResult {
  voted: boolean;
  voteCount: number;
}

// ---- POST /community/posts/:id/comments ----
export interface CreateCommunityCommentBody {
  parentId?: string;
  body: string;
}

// ---- POST /community/posts/:id/report ----
export interface ReportCommunityPostBody {
  reason: string;
}

// ---- POST /community-media/upload-requests ----
export interface CommunityMediaUploadRequest {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

// ---- Admin: GET /admin/community/flagged, PATCH /admin/community/posts/:id/status ----
export interface AdminCommunityPost extends CommunityPost {
  reports: Array<{ id: string; reason: string; createdAt: string; reporter: CommunityAuthor }>;
}

export interface ModerateCommunityPostBody {
  status: "VISIBLE" | "HIDDEN";
}
