export const enum BookingEvent {
    BOOKING_CREATED = 'booking.created',
    BOOKING_CANCELLED = 'booking.cancelled',
    BOOKING_UPDATED = 'booking.updated',
    TRIP_CREATED = 'trip.created',
    TRIP_STARTED = 'trip.started',
    TRIP_COMPLETED = 'trip.completed',
    TRIP_CANCELLED = 'trip.cancelled',
    SCHEDULE_CREATED = 'schedule.created',
    SCHEDULE_UPDATED = 'schedule.updated',
    SCHEDULE_DELETED = 'schedule.deleted',
    DRIVER_ASSIGNED = 'trip.driver-assigned',
    TRIP_BOARDING_OPENED = 'trip.boarding-open',
}
