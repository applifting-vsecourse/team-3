import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompleteOnboardingDto } from './onboarding.dto';

describe(CompleteOnboardingDto.name, () => {
  it.each(
    [[], ['a'], ['a', 'b'], ['a', 'a', 'b'], ['a', 'b', 'c', 'd']].map(
      (interestIds) => ({ interestIds }),
    ),
  )('refuses the activity selection $interestIds', async ({ interestIds }) => {
    const input = plainToInstance(CompleteOnboardingDto, {
      homeLocalityId: 'brno',
      interestIds,
    });
    expect((await validate(input)).map(({ property }) => property)).toContain(
      'interestIds',
    );
  });

  it('accepts three distinct activities with or without a bio', async () => {
    const input = { homeLocalityId: 'brno', interestIds: ['a', 'b', 'c'] };
    expect(
      await validate(plainToInstance(CompleteOnboardingDto, input)),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(CompleteOnboardingDto, {
          ...input,
          bio: 'Baví mě výlety.',
        }),
      ),
    ).toEqual([]);
  });
});
