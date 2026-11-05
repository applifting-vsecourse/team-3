import { REQUEST_MESSAGE_MAX_LENGTH } from '@/shared/request-message/request-message';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RequestMessageDto } from './request-message.dto';

const parse = (
  body: Record<string, unknown>,
): { dto: RequestMessageDto; errors: string[] } => {
  const dto = plainToInstance(RequestMessageDto, body);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);
  return { dto, errors };
};

describe('RequestMessageDto (#175)', () => {
  it('the message is optional: no body, no message', () => {
    expect(parse({}).errors).toEqual([]);
    expect(parse({}).dto.message).toBeUndefined();
    expect(parse({ message: null }).errors).toEqual([]);
  });

  it('trims the message', () => {
    const { dto, errors } = parse({ message: '  Ahoj, hraju rád.  \n' });
    expect(errors).toEqual([]);
    expect(dto.message).toBe('Ahoj, hraju rád.');
  });

  it('a blank message is none (null)', () => {
    for (const message of ['', '   ', '\n\t ']) {
      const { dto, errors } = parse({ message });
      expect(errors).toEqual([]);
      expect(dto.message).toBeNull();
    }
  });

  it(`a message has at most ${REQUEST_MESSAGE_MAX_LENGTH} characters, counted after trimming`, () => {
    const longest = 'x'.repeat(REQUEST_MESSAGE_MAX_LENGTH);
    expect(parse({ message: longest }).errors).toEqual([]);
    expect(parse({ message: `  ${longest}  ` }).errors).toEqual([]);
    expect(parse({ message: `${longest}x` }).errors).toEqual(['message']);
  });

  it('refuses a message that is not text, and unknown fields', () => {
    expect(parse({ message: 42 }).errors).toEqual(['message']);
    expect(parse({ message: ['a'] }).errors).toEqual(['message']);
    expect(parse({ status: 'approved' }).errors).toEqual(['status']);
  });
});
