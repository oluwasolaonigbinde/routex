# RouteX Migrations

This project contains database migrations for the RouteX application, specifically focusing on changes to the booking and passenger trip models.

## Migration Steps

### 1. Expand Booking and Passenger Trip Enums

- **Migration File**: `prisma/migrations/20240115000000_expand_booking_and_passenger_trip_enums/migration.sql`
- **Purpose**:
    - Change the booking status enum from `refunded` to `cancelled`.
    - Add a new column `reservation_expires_at` to the booking model.
    - Expand the passenger trip enum to include a new status: `completed`.

### 2. Migrate Alighted to Completed and Contract

- **Migration File**: `prisma/migrations/20240115000001_migrate_alighted_to_completed_and_contract/migration.sql`
- **Purpose**:
    - Update any passenger trips currently marked as `alighted` to `completed`.
    - Remove the `alighted` status from the passenger trip enum.

## Applying Migrations

To apply these migrations, use the Prisma migration commands. Ensure that your database is properly configured and that you have the necessary permissions to make schema changes.

1. Run the migration for expanding booking and passenger trip enums:

    ```
    npx prisma migrate dev --name expand_booking_and_passenger_trip_enums
    ```

2. Run the migration for migrating alighted to completed and contracting:
    ```
    npx prisma migrate dev --name migrate_alighted_to_completed_and_contract
    ```

## Conclusion

These migrations are essential for maintaining the integrity and functionality of the RouteX application as it evolves. Always ensure to back up your database before applying migrations.
