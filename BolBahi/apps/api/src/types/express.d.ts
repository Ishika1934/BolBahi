export interface AuthContext {
  userId: string;
  shopId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      shopId?: string;
    }
  }
}

