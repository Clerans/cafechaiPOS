import { create } from "zustand";

interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  status: string;
  role: string;
  branch: {
    id: number;
    name: string;
    code: string;
  } | null;
  permissions: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => void;
  logout: () => void;
  updateAccessToken: (accessToken: string) => void;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Read state from localStorage to resume session on refresh
  const getStoredAuth = () => {
    try {
      const stored = localStorage.getItem("pos-auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          user: parsed.user || null,
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
          isAuthenticated: !!parsed.accessToken,
        };
      }
    } catch (e) {
      console.error("Failed to parse stored auth", e);
    }
    return { user: null, accessToken: null, refreshToken: null, isAuthenticated: false };
  };

  const stored = getStoredAuth();

  return {
    ...stored,
    login: (accessToken, refreshToken, user) => {
      localStorage.setItem("pos-auth", JSON.stringify({ accessToken, refreshToken, user }));
      set({ accessToken, refreshToken, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem("pos-auth");
      set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
    },
    updateAccessToken: (accessToken) => {
      const current = get();
      if (current.user) {
        localStorage.setItem(
          "pos-auth",
          JSON.stringify({ accessToken, refreshToken: current.refreshToken, user: current.user })
        );
        set({ accessToken });
      }
    },
    hasPermission: (permissionCode) => {
      const { user } = get();
      if (!user) return false;

      // Super Admin has absolute permissions bypass
      if (user.role === "Super Admin") return true;

      return user.permissions.includes(permissionCode);
    },
  };
});
