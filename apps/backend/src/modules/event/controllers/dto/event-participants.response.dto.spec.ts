import { EventParticipantsResponseDto } from './event-participants.response.dto';

describe('EventParticipantsResponseDto.fromDomain', () => {
  it('sends only the id and the name of each participant, in order', () => {
    const withMore = { id: 'u2', name: 'Jana', email: 'jana@example.com' };

    expect(
      EventParticipantsResponseDto.fromDomain({
        participants: [withMore, { id: 'u3', name: 'Tomáš' }],
        requests: [],
      }).participants,
    ).toEqual([
      { id: 'u2', name: 'Jana' },
      { id: 'u3', name: 'Tomáš' },
    ]);
  });

  it('sends a request with its id, name and when it was sent, nothing more (#53)', () => {
    const request = {
      id: 'u4',
      name: 'Jakub',
      requestedAt: new Date('2026-10-24T10:00:00.000Z'),
      email: 'jakub@example.com',
    };

    expect(
      EventParticipantsResponseDto.fromDomain({
        participants: [],
        requests: [request],
      }).requests,
    ).toEqual([
      { id: 'u4', name: 'Jakub', requestedAt: '2026-10-24T10:00:00.000Z' },
    ]);
  });
});
