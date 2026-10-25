import {
  SIMULATED_INBOX_PER_ADDRESS,
  SIMULATED_INBOX_TOTAL,
  SimulatedInbox,
} from './simulated-inbox';

const VERIFY = 'Ověř si e-mail v HobbyHubu';
const at = (minute: number): Date =>
  new Date(Date.UTC(2026, 9, 25, 12, minute));

describe('SimulatedInbox', () => {
  it('keeps the verification e-mails of an address, newest first', () => {
    const inbox = new SimulatedInbox(VERIFY);
    inbox.record('eva@example.com', VERIFY, '<a>1</a>', at(1));
    inbox.record('eva@example.com', VERIFY, '<a>2</a>', at(2));

    expect(inbox.messagesFor('eva@example.com')).toMatchObject([
      { subject: VERIFY, html: '<a>2</a>', sentAt: at(2) },
      { subject: VERIFY, html: '<a>1</a>', sentAt: at(1) },
    ]);
  });

  it('never keeps another e-mail, e.g. the password reset', () => {
    const inbox = new SimulatedInbox(VERIFY);
    inbox.record('eva@example.com', 'Nové heslo do HobbyHubu', '<a>reset</a>');

    expect(inbox.messagesFor('eva@example.com')).toEqual([]);
  });

  it('shows an address only its own e-mails, whatever the letter case', () => {
    const inbox = new SimulatedInbox(VERIFY);
    inbox.record('eva@example.com', VERIFY, '<a>eva</a>');
    inbox.record('jakub@example.com', VERIFY, '<a>jakub</a>');

    expect(
      inbox.messagesFor('Eva@Example.com').map((email) => email.html),
    ).toEqual(['<a>eva</a>']);
    expect(inbox.messagesFor('petra@example.com')).toEqual([]);
  });

  it(`keeps the last ${SIMULATED_INBOX_PER_ADDRESS} per address`, () => {
    const inbox = new SimulatedInbox(VERIFY);
    for (let i = 1; i <= SIMULATED_INBOX_PER_ADDRESS + 2; i++) {
      inbox.record('eva@example.com', VERIFY, `<a>${i}</a>`, at(i));
    }

    expect(
      inbox.messagesFor('eva@example.com').map((email) => email.html),
    ).toEqual(['<a>5</a>', '<a>4</a>', '<a>3</a>']);
  });

  it(`keeps at most ${SIMULATED_INBOX_TOTAL} in total, dropping the oldest`, () => {
    const inbox = new SimulatedInbox(VERIFY);
    for (let i = 0; i <= SIMULATED_INBOX_TOTAL; i++) {
      inbox.record(`user${i}@example.com`, VERIFY, `<a>${i}</a>`);
    }

    expect(inbox.messagesFor('user0@example.com')).toEqual([]);
    expect(inbox.messagesFor('user1@example.com')).toHaveLength(1);
    expect(
      inbox.messagesFor(`user${SIMULATED_INBOX_TOTAL}@example.com`),
    ).toHaveLength(1);
  });
});
