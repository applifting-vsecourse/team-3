import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateEventMessageDto } from './event-message.dto';

// Same transform the controller's ValidationPipe runs on the raw body.
const parse = (
  body: Record<string, unknown>,
): { dto: CreateEventMessageDto; invalid: string[]; messages: string[] } => {
  const dto = plainToInstance(CreateEventMessageDto, body);
  const errors = validateSync(dto, { whitelist: true });
  return {
    dto,
    invalid: errors.map((error) => error.property).sort(),
    messages: errors.flatMap((error) => Object.values(error.constraints ?? {})),
  };
};

describe('CreateEventMessageDto (#176)', () => {
  it('trims both and keeps the line breaks inside the text', () => {
    const { dto, invalid } = parse({
      subject: '  Sraz u vchodu  ',
      body: '\n Sraz v 17:50.\nVezmi si sálovky. \n',
    });
    expect(invalid).toEqual([]);
    expect(dto.subject).toBe('Sraz u vchodu');
    expect(dto.body).toBe('Sraz v 17:50.\nVezmi si sálovky.');
  });

  it('requires a subject and a text; blank is missing, in Czech', () => {
    expect(parse({}).invalid).toEqual(['body', 'subject']);
    const blank = parse({ subject: '   ', body: ' \n ' });
    expect(blank.invalid).toEqual(['body', 'subject']);
    expect(blank.messages).toEqual(
      expect.arrayContaining(['Napiš předmět', 'Napiš text zprávy']),
    );
  });

  it('refuses a subject over 120 and a text over 2000 characters', () => {
    expect(
      parse({ subject: 'a'.repeat(121), body: 'b'.repeat(2001) }).invalid,
    ).toEqual(['body', 'subject']);
    expect(
      parse({ subject: 'a'.repeat(120), body: 'b'.repeat(2000) }).invalid,
    ).toEqual([]);
  });

  it('refuses anything that is not text', () => {
    expect(parse({ subject: 5, body: ['x'] }).invalid).toEqual([
      'body',
      'subject',
    ]);
  });
});
