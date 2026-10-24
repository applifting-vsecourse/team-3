import { passwordProblem } from './password-policy';

describe('passwordProblem (B-010)', () => {
  it('accepts 10 characters with a letter and a digit, Czech letters too', () => {
    expect(passwordProblem('hobbyhub26')).toBeNull();
    expect(passwordProblem('žluťoučký1')).toBeNull();
  });

  it('refuses a short one, one without a digit and one without a letter', () => {
    const rule = 'Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici.';
    expect(passwordProblem('hobbyhub2')).toBe(rule);
    expect(passwordProblem('hobbyhubhobbyhub')).toBe(rule);
    expect(passwordProblem('1234567890')).toBe(rule);
  });
});
