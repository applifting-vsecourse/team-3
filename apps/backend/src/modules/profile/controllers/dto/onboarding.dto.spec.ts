import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { CompleteOnboardingDto } from './onboarding.dto';

const preferences = {
  homeLocalityId: 'brno',
  interestIds: ['walking', 'running', 'games'],
};

function check(input: Record<string, unknown>): Promise<ValidationError[]> {
  return validate(plainToInstance(CompleteOnboardingDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe(CompleteOnboardingDto.name, () => {
  it.each([
    { label: 'missing', interestIds: undefined, rule: 'isArray' },
    { label: 'null', interestIds: null, rule: 'isArray' },
    { label: 'scalar', interestIds: 'walking', rule: 'isArray' },
    { label: 'empty list', interestIds: [], rule: 'arrayMinSize' },
    {
      label: 'four activities',
      interestIds: ['a', 'b', 'c', 'd'],
      rule: 'arrayMaxSize',
    },
    { label: 'duplicate', interestIds: ['a', 'a', 'b'], rule: 'arrayUnique' },
    { label: 'number ID', interestIds: ['a', 3, 'c'], rule: 'isString' },
    { label: 'null ID', interestIds: ['a', null, 'c'], rule: 'isString' },
    {
      label: 'object ID',
      interestIds: ['a', { id: 'b' }, 'c'],
      rule: 'isString',
    },
    { label: 'empty ID', interestIds: ['a', '', 'c'], rule: 'isNotEmpty' },
    {
      label: 'overlong ID',
      interestIds: ['a', 'b'.repeat(101), 'c'],
      rule: 'maxLength',
    },
  ])(
    'refuses an activity selection with $label',
    async ({ interestIds, rule }) => {
      const issues = await check({ ...preferences, interestIds });
      expect(
        issues.find(({ property }) => property === 'interestIds')?.constraints,
      ).toHaveProperty(rule);
    },
  );

  it.each([
    { label: 'missing', homeLocalityId: undefined, rule: 'isNotEmpty' },
    { label: 'null', homeLocalityId: null, rule: 'isNotEmpty' },
    { label: 'empty string', homeLocalityId: '', rule: 'isNotEmpty' },
    { label: 'number', homeLocalityId: 7, rule: 'isString' },
    { label: 'object', homeLocalityId: { id: 'brno' }, rule: 'isString' },
    { label: 'overlong', homeLocalityId: 'l'.repeat(101), rule: 'maxLength' },
  ])('refuses a $label locality ID', async ({ homeLocalityId, rule }) => {
    const issues = await check({ ...preferences, homeLocalityId });
    expect(
      issues.find(({ property }) => property === 'homeLocalityId')?.constraints,
    ).toHaveProperty(rule);
  });

  it.each([1, 2, 3])('accepts %i distinct activities', async (count) => {
    expect(
      await check({
        ...preferences,
        interestIds: preferences.interestIds.slice(0, count),
      }),
    ).toEqual([]);
  });

  it('accepts the maximum length for each ID', async () => {
    expect(
      await check({
        homeLocalityId: 'l'.repeat(100),
        interestIds: ['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(100)],
      }),
    ).toEqual([]);
  });

  it.each([
    { field: 'bio', value: 'Text', rule: 'whitelistValidation' },
    { field: 'userId', value: 'another-account', rule: 'whitelistValidation' },
    { field: 'bioVisibility', value: 'everyone', rule: 'whitelistValidation' },
    {
      field: 'onboardingCompletedAt',
      value: new Date(),
      rule: 'whitelistValidation',
    },
  ])('refuses an invalid $field', async ({ field, value, rule }) => {
    const issues = await check({ ...preferences, [field]: value });
    expect(
      issues.find(({ property }) => property === field)?.constraints,
    ).toHaveProperty(rule);
  });
});
