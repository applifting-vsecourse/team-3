import { queryBoolean } from './query-boolean';

describe('queryBoolean', () => {
  it('turns „true“ and „false“ into booleans', () => {
    expect(queryBoolean({ value: 'true' })).toBe(true);
    expect(queryBoolean({ value: 'false' })).toBe(false);
  });

  it('leaves anything else for the validator to refuse', () => {
    expect(queryBoolean({ value: 'yes' })).toBe('yes');
    expect(queryBoolean({ value: undefined })).toBeUndefined();
  });
});
