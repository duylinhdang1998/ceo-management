import { JwtPayload } from '../common/auth/current-user.decorator';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
