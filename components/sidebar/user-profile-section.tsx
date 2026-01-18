import { UserProfileSectionClient } from "./user-profile-section-client";

export function ProfileSkeleton() {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3 rounded-lg p-2 -m-2">
        <div className="h-8 w-8 rounded-full bg-muted/40 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col items-start gap-1">
            <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserProfileSection() {
  return (
    <div
      className="p-4 flex-shrink-0 flex items-center justify-center"
      style={{ minHeight: "80px" }}
    >
      <UserProfileSectionClient serverSkeleton={<ProfileSkeleton />} />
    </div>
  );
}
