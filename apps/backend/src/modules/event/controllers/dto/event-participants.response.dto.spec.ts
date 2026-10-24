import { EventParticipantsResponseDto } from './event-participants.response.dto';

describe('EventParticipantsResponseDto.fromDomain', () => {
  it('sends only the id and the name of each participant, in order', () => {
    const withMore = { id: 'u2', name: 'Jana', email: 'jana@example.com' };

    expect(
      EventParticipantsResponseDto.fromDomain([
        withMore,
        { id: 'u3', name: 'Tomáš' },
      ]),
    ).toEqual({
      participants: [
        { id: 'u2', name: 'Jana' },
        { id: 'u3', name: 'Tomáš' },
      ],
    });
  });
});
