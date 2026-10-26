import { SignInProviders } from '@/shared/auth/config/social-sign-in';
import { ApiProperty } from '@nestjs/swagger';

/** GET /sign-in-providers (#154): what the sign-in pages offer besides e-mail and password. */
export class SignInProvidersResponseDto implements SignInProviders {
  @ApiProperty({
    description:
      'Sign-in with Google is set up (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)',
  })
  google!: boolean;
}
