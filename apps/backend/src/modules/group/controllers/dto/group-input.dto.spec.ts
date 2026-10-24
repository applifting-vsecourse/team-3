import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateGroupDto, UpdateGroupDto } from './group-input.dto';

// Same transform the controller's ValidationPipe runs on the raw body.
const parse = <T extends object>(
  cls: new () => T,
  body: Record<string, unknown>,
): { dto: T; invalid: string[] } => {
  const dto = plainToInstance(cls, body);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, invalid: errors.map((error) => error.property) };
};

const valid = {
  name: 'Deskovky Holešovice',
  activityId: 'a-deskove-hry',
  localityId: 'l-praha-7',
  type: 'closed',
};

describe('CreateGroupDto', () => {
  it('accepts the required fields without a description', () => {
    expect(parse(CreateGroupDto, valid).invalid).toEqual([]);
  });

  it('requires name, activity, locality and type', () => {
    expect(parse(CreateGroupDto, {}).invalid.sort()).toEqual([
      'activityId',
      'localityId',
      'name',
      'type',
    ]);
  });

  it('trims the name and rejects one made of spaces', () => {
    expect(
      parse(CreateGroupDto, { ...valid, name: '  Florbal  ' }).dto.name,
    ).toBe('Florbal');
    expect(parse(CreateGroupDto, { ...valid, name: '   ' }).invalid).toEqual([
      'name',
    ]);
  });

  it('rejects a name over 80 characters', () => {
    expect(
      parse(CreateGroupDto, { ...valid, name: 'x'.repeat(81) }).invalid,
    ).toEqual(['name']);
  });

  it('stores an empty description as null', () => {
    expect(
      parse(CreateGroupDto, { ...valid, description: '  ' }).dto.description,
    ).toBeNull();
  });

  it('accepts only public or closed', () => {
    expect(parse(CreateGroupDto, { ...valid, type: 'public' }).invalid).toEqual(
      [],
    );
    expect(
      parse(CreateGroupDto, { ...valid, type: 'private' }).invalid,
    ).toEqual(['type']);
  });
});

describe('UpdateGroupDto', () => {
  it('accepts a single changed field', () => {
    expect(parse(UpdateGroupDto, { name: 'Deskovky Letná' }).invalid).toEqual(
      [],
    );
    expect(parse(UpdateGroupDto, { type: 'public' }).invalid).toEqual([]);
  });

  it('rejects null for a required field instead of clearing it', () => {
    expect(
      parse(UpdateGroupDto, {
        name: null,
        activityId: null,
        type: null,
      }).invalid.sort(),
    ).toEqual(['activityId', 'name', 'type']);
  });

  it('null or empty removes the description', () => {
    expect(parse(UpdateGroupDto, { description: null }).invalid).toEqual([]);
    expect(
      parse(UpdateGroupDto, { description: '' }).dto.description,
    ).toBeNull();
  });
});
