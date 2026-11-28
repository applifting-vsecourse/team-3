-- #465: the applicant hears their request can no longer be decided once the event started
ALTER TYPE "notification_type" ADD VALUE 'request_expired';
