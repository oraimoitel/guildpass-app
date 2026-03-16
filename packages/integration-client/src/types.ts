export type RoleKey = "admin" | "member" | "contributor";
export type MembershipStatus = "active" | "inactive" | "unknown";
export type Membership = {
  userId: string;
  wallet?: string;
  status: MembershipStatus;
  roles: RoleKey[];
  updatedAt: string;
};
export type IntegrationClientOptions = {
  baseUrl: string;
  apiKey?: string;
};
export type VerificationResult = {
  userId: string;
  wallet: string;
  verified: boolean;
  message?: string;
};
