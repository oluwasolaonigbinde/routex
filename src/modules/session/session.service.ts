import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import {
    SessionNotFoundException,
    UserWithIdNotFoundException,
} from '@/common/exception/exception';
import { PaginatedQuery } from '@/util/dto';

@Injectable()
export class SessionService {
    constructor(private databaseService: DatabaseService) {}

    async createSession(
        createSessionInput: Prisma.SessionUncheckedCreateInput,
    ) {
        const { userId, ...rest } = createSessionInput;
        const lastSeenAt = new Date();

        const session = await this.databaseService.session.create({
            data: {
                ...rest,
                userId: userId,
                lastSeenAt: lastSeenAt,
            },
        });
        return session;
    }

    async verifySession(userId: string, tokenId: string, refreshToken: string) {
        const session = await this.databaseService.session.findUnique({
            where: { id: tokenId },
        });

        if (!session) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const tokenMatches = await bcrypt.compare(
            refreshToken,
            session.tokenHash,
        );

        if (!tokenMatches) {
            throw new UnauthorizedException('Refresh token is not valid');
        }

        return session;
    }

    async deleteSession(tokenId: string): Promise<boolean> {
        try {
            await this.databaseService.session.delete({
                where: {
                    id: tokenId,
                },
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new SessionNotFoundException();
                }
            }
            throw error;
        }
    }

    async invalidateUserSessions(userId: string): Promise<boolean> {
        try {
            await this.databaseService.session.deleteMany({
                where: { userId: userId },
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new UserWithIdNotFoundException(userId);
                }
            }
            throw error;
        }
    }

    async getUserSessions(
        userId: string,
        query: PaginatedQuery,
        currentSessionId?: string,
    ) {
        const { limit, page } = query;
        const skip = (page - 1) * limit;

        // Get total count of distinct devices
        const totalCountResult = await this.databaseService.$queryRaw<
            [{ count: number }]
        >`
            SELECT COUNT(DISTINCT device_id)::int as count
            FROM "Session"
            WHERE user_id = ${userId}
        `;
        const totalCount = totalCountResult[0]?.count || 0;

        const devices = await this.databaseService.$queryRaw`
    WITH device_summary AS (
      SELECT 
        device_id,
        device_name,   
        MAX(last_seen_at) as last_seen,
        MIN(created_at) as first_seen,
        COUNT(*)::int as active_sessions,
        bool_or(id = ${currentSessionId}) as is_current_device
      FROM "Session"
      WHERE user_id = ${userId}
      GROUP BY device_id, device_name
    ),
    latest_sessions AS (
      SELECT DISTINCT ON (device_id)
        device_id,
        id as session_id,
        ip_address,
        user_agent,
        last_seen_at,
        expires_at
      FROM "Session"
      WHERE user_id = ${userId}
      ORDER BY device_id, last_seen_at DESC
    ),
    current_session_details AS (
      -- Get details of the CURRENT session specifically
      SELECT 
        device_id,
        id as session_id,
        ip_address,
        user_agent,
        expires_at
      FROM "Session"
      WHERE id = ${currentSessionId}
    )
    SELECT 
        
      ds.device_id as "deviceId",
      ds.device_name as "deviceName",
      ds.last_seen as "lastSeen",
      ds.first_seen as "firstSeen",
      ds.is_current_device as "isCurrentDevice",
      ds.active_sessions as "activeSessions",
      ${userId} as "userId",
      -- Use current session details if this is the current device,
      -- otherwise use latest session details
      CASE 
        WHEN ds.is_current_device THEN csd.session_id
        ELSE ls.session_id
      END as "sessionId",
      CASE 
        WHEN ds.is_current_device THEN csd.ip_address
        ELSE ls.ip_address
      END as "ipAddress",
      CASE 
        WHEN ds.is_current_device THEN csd.user_agent
        ELSE ls.user_agent
      END as "userAgent",
      CASE 
        WHEN ds.is_current_device THEN csd.expires_at
        ELSE ls.expires_at
      END as "expiresAt"
    FROM device_summary ds
    LEFT JOIN latest_sessions ls ON ds.device_id = ls.device_id
    LEFT JOIN current_session_details csd ON ds.device_id = csd.device_id
    ORDER BY ds.is_current_device DESC, ds.last_seen DESC
    -- ↑ Current device always shows first!
    LIMIT ${limit}
    OFFSET ${skip}
  `;

        return {
            totalCount,
            page,
            limit,
            results: devices,
        };
    }

    async revokeDeviceSessions(
        userId: string,
        deviceId: string,
    ): Promise<boolean> {
        await this.databaseService.session.deleteMany({
            where: {
                userId: userId,
                deviceId: deviceId,
            },
        });
        return true;
    }

    async revokeSessionById(
        userId: string,
        sessionId: string,
    ): Promise<boolean> {
        try {
            await this.databaseService.session.delete({
                where: {
                    id: sessionId,
                    userId: userId,
                },
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new SessionNotFoundException();
                }
            }
            throw error;
        }
    }
}
