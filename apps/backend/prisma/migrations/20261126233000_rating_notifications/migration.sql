-- PO 26. 11.: an upozornění when someone rates you or your event
ALTER TYPE "notification_type" ADD VALUE 'event_rated';
ALTER TYPE "notification_type" ADD VALUE 'participant_rated';
