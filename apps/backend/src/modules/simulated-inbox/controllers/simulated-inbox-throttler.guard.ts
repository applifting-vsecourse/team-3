import {
  SIMULATED_INBOX,
  SimulatedInbox,
} from '@/core/email/simulated-inbox/simulated-inbox';
import { simulatedInboxOff } from '@/modules/simulated-inbox/services/simulated-inbox.service';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { inboxAddress, SimulatedInboxLimits } from './simulated-inbox-limits';

type InboxRequest = { body?: { email?: unknown }; ip?: string };

const tooManyRequests = (): HttpException =>
  new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      // shown as it is in the inbox dialog
      message: 'Příliš mnoho pokusů. Zkus to prosím za pár minut.',
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );

/**
 * In front of the simulated inbox, which checks a password: 404 first where
 * the inbox is off (production with real e-mails), so nothing is counted
 * there; then 100 looks per IP and 20 failed looks per address in 10 minutes
 * (429, SimulatedInboxLimits). The IP is Express's `request.ip`, never a
 * header the client could set: behind a proxy it comes from `trust proxy`
 * (TRUST_PROXY_HOPS). The e-mail is only read here; whether it is valid is
 * the DTO's job, and an address is stored only after that (the controller).
 * Not @nestjs/throttler: its module is global, and a second `forRoot` next to
 * the catalog's would make the options ambiguous.
 */
@Injectable()
export class SimulatedInboxThrottlerGuard implements CanActivate {
  constructor(
    @Inject(SIMULATED_INBOX) private readonly inbox: SimulatedInbox | null,
    private readonly limits: SimulatedInboxLimits,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.inbox) throw simulatedInboxOff();

    const request = context.switchToHttp().getRequest<InboxRequest>();
    if (!this.limits.hitIp(request.ip ?? 'unknown')) throw tooManyRequests();
    const email = request.body?.email;
    if (
      typeof email === 'string' &&
      this.limits.isAddressLocked(inboxAddress(email))
    ) {
      throw tooManyRequests();
    }
    return true;
  }
}
