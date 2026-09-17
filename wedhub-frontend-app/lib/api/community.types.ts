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

// Reddit-style anonymous handle only — never the poster's real name/email
// (the backend's AUTHOR_SELECT never selects those fields for a community
// response). communityUsername is only ever null for a not-yet-generated
// handle, which shouldn't be observable post-generation (every write path
// generates one before returning), but the type stays defensive about it.
export interface CommunityAuthor {
  id: string;
  profile: { communityUsername: string | null } | null;
}

export interface CommunityPostMedia {
  id: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  originalObjectKey: string;
  blurDataUrl: string | null;
}

export type CommunityPostStatus = "VISIBLE" | "FLAGGED" | "HIDDEN";
export type CommunityPostType = "TEXT" | "POLL";

export interface CommunityPollOption {
  id: string;
  postId: string;
  label: string;
  sortOrder: number;
  voteCount: number;
}

export interface CommunityPost {
  id: string;
  authorUserId: string;
  tagId: string | null;
  postType: CommunityPostType;
  title: string;
  body: string | null;
  status: CommunityPostStatus;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
  tag: CommunityTag | null;
  media: CommunityPostMedia[];
  // Present only for postType === "POLL".
  pollOptions: CommunityPollOption[];
  // Only present when the request was made with a session — at most one
  // row (unique [postId, userId]) telling the frontend "you upvoted this"
  // without a separate per-post round trip.
  votes?: { id: string }[];
  // Same shape for the viewer's own poll vote (unique [postId, userId]) —
  // at most one row, telling the frontend which option (if any) to show as
  // selected.
  pollVotes?: { optionId: string }[];
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
export type CreateCommunityPostBody =
  | { postType: "TEXT"; tagId?: string; title: string; body: string; mediaId?: string }
  | { postType: "POLL"; tagId?: string; title: string; body?: string; mediaId?: string; options: string[] };

// ---- POST /community/posts/:id/vote ----
export interface ToggleVoteResult {
  voted: boolean;
  voteCount: number;
}

// ---- POST /community/posts/:id/poll-vote ----
export interface CastPollVoteBody {
  optionId: string;
}

export interface CastPollVoteResult {
  optionId: string;
  options: { id: string; label: string; voteCount: number }[];
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
