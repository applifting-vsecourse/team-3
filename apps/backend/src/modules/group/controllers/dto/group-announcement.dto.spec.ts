import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateGroupAnnouncementDto } from './group-announcement.dto';

// Same transform the controller's ValidationPipe runs on the raw body.
const parse = (
  body: Record<string, unknown>,
): { dto: CreateGroupAnnouncementDto; invalid: string[] } => {
  const dto = plainToInstance(CreateGroupAnnouncementDto, body);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, invalid: errors.map((error) => error.property).sort() };
};

describe('CreateGroupAnnouncementDto (#194)', () => {
  it('trims both and keeps the line breaks inside the text', () => {
    const { dto, invalid } = parse({
      subject: '  Pauza  ',
      body: '\n Přes svátky se nehraje.\nUvidíme se 6. 1. \n',
    });
    expect(invalid).toEqual([]);
    expect(dto.subject).toBe('Pauza');
    expect(dto.body).toBe('Přes svátky se nehraje.\nUvidíme se 6. 1.');
  });

  it('requires a subject and a text; blank is missing', () => {
    expect(parse({}).invalid).toEqual(['body', 'subject']);
    expect(parse({ subject: '   ', body: ' \n ' }).invalid).toEqual([
      'body',
      'subject',
    ]);
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
