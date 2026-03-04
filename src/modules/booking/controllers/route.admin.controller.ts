import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import { RolesRequired } from '@/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { SerializeOptions } from '@/util/decorator';
import { RouteService } from '@/modules/booking/services/route.service';
import {
    LocationEntityApiResponse,
    LocationListApiResponse,
    RouteEntityApiResponse,
    RouteListApiResponse,
    RouteStopEntityApiResponse,
    RouteStopListApiResponse,
} from '@/modules/booking/entities/route.entity';
import {
    CreateLocationDto,
    CreateRouteDto,
    CreateRouteStopDto,
    CreateVehicleDto,
    GetLocationsDto,
    GetRoutesDto,
    GetVehiclesDto,
    UpdateLocationDto,
    UpdateRouteDto,
    UpdateRouteStopDto,
    UpdateVehicleDto,
} from '@/modules/booking/dto/route.dto';
import {
    VehicleEntityApiResponse,
    VehicleListApiResponse,
} from '@/modules/booking/entities/vehicle.entity';

@ApiTags('Admin Routes Management')
@ApiBearerAuth()
@Controller('admin/routes')
@Tenant('ADMIN')
@RolesRequired(Role.ADMIN, Role.SUPERADMIN)
export class RouteAdminController {
    constructor(private readonly routeService: RouteService) {}

    // ========== LOCATIONS ==========

    @Post('locations')
    @ApiOperation({ summary: 'Create a new location' })
    @ApiResponse({
        status: 201,
        description: 'Location created successfully',
        type: LocationEntityApiResponse,
    })
    @SerializeOptions({
        type: LocationEntityApiResponse,
        strategy: 'excludeAll',
    })
    async createLocation(
        @Body() dto: CreateLocationDto,
    ): Promise<LocationEntityApiResponse> {
        const data = await this.routeService.createLocation(dto);

        return {
            status: 'success',
            message: 'Location created successfully',
            data,
        };
    }

    @Get('locations')
    @ApiOperation({ summary: 'List all locations' })
    @ApiResponse({
        status: 200,
        description: 'List of locations',
        type: LocationListApiResponse,
    })
    @SerializeOptions({ type: LocationListApiResponse, strategy: 'excludeAll' })
    async listLocations(
        @Query() query: GetLocationsDto,
    ): Promise<LocationListApiResponse> {
        const data = await this.routeService.listLocations(query);

        return {
            status: 'success',
            message: 'Locations retrieved successfully',
            data,
        };
    }

    @Get('locations/:id')
    @ApiOperation({ summary: 'Get location by ID' })
    @ApiResponse({
        status: 200,
        description: 'Location details',
        type: LocationEntityApiResponse,
    })
    @SerializeOptions({
        type: LocationEntityApiResponse,
        strategy: 'excludeAll',
    })
    async getLocation(
        @Param('id') id: string,
    ): Promise<LocationEntityApiResponse> {
        const data = await this.routeService.getLocation(id);

        return {
            status: 'success',
            message: 'Location retrieved successfully',
            data,
        };
    }

    @Patch('locations/:id')
    @ApiOperation({ summary: 'Update location' })
    @ApiResponse({
        status: 200,
        description: 'Location updated successfully',
        type: LocationEntityApiResponse,
    })
    @SerializeOptions({
        type: LocationEntityApiResponse,
        strategy: 'excludeAll',
    })
    async updateLocation(
        @Param('id') id: string,
        @Body() dto: UpdateLocationDto,
    ): Promise<LocationEntityApiResponse> {
        const data = await this.routeService.updateLocation(id, dto);

        return {
            status: 'success',
            message: 'Location updated successfully',
            data,
        };
    }

    @Delete('locations/:id')
    @ApiOperation({ summary: 'Delete location' })
    @ApiResponse({
        status: 200,
        description: 'Location deleted successfully',
    })
    async deleteLocation(@Param('id') id: string) {
        await this.routeService.deleteLocation(id);

        return {
            status: 'success',
            message: 'Location deleted successfully',
        };
    }

    // ========== VEHICLES ==========

    @Post('vehicles')
    @ApiOperation({ summary: 'Create a new vehicle' })
    @ApiResponse({
        status: 201,
        description: 'Vehicle created successfully',
        type: VehicleEntityApiResponse,
    })
    @SerializeOptions({
        type: VehicleEntityApiResponse,
        strategy: 'excludeAll',
    })
    async createVehicle(
        @Body() dto: CreateVehicleDto,
    ): Promise<VehicleEntityApiResponse> {
        const data = await this.routeService.createVehicle(dto);

        return {
            status: 'success',
            message: 'Vehicle created successfully',
            data,
        };
    }

    @Get('vehicles')
    @ApiOperation({ summary: 'List all vehicles' })
    @ApiResponse({
        status: 200,
        description: 'List of vehicles',
        type: VehicleListApiResponse,
    })
    @SerializeOptions({ type: VehicleListApiResponse, strategy: 'excludeAll' })
    async listVehicles(
        @Query() query: GetVehiclesDto,
    ): Promise<VehicleListApiResponse> {
        const data = await this.routeService.listVehicles(query);

        return {
            status: 'success',
            message: 'Vehicles retrieved successfully',
            data,
        };
    }

    @Get('vehicles/:id')
    @ApiOperation({ summary: 'Get vehicle by ID' })
    @ApiResponse({
        status: 200,
        description: 'Vehicle details',
        type: VehicleEntityApiResponse,
    })
    @SerializeOptions({
        type: VehicleEntityApiResponse,
        strategy: 'excludeAll',
    })
    async getVehicle(
        @Param('id') id: string,
    ): Promise<VehicleEntityApiResponse> {
        const data = await this.routeService.getVehicle(id);

        return {
            status: 'success',
            message: 'Vehicle retrieved successfully',
            data,
        };
    }

    @Patch('vehicles/:id')
    @ApiOperation({ summary: 'Update vehicle' })
    @ApiResponse({
        status: 200,
        description: 'Vehicle updated successfully',
        type: VehicleEntityApiResponse,
    })
    @SerializeOptions({
        type: VehicleEntityApiResponse,
        strategy: 'excludeAll',
    })
    async updateVehicle(
        @Param('id') id: string,
        @Body() dto: UpdateVehicleDto,
    ): Promise<VehicleEntityApiResponse> {
        const data = await this.routeService.updateVehicle(id, dto);

        return {
            status: 'success',
            message: 'Vehicle updated successfully',
            data,
        };
    }

    @Delete('vehicles/:id')
    @ApiOperation({ summary: 'Delete vehicle' })
    @ApiResponse({
        status: 200,
        description: 'Vehicle deleted successfully',
    })
    async deleteVehicle(@Param('id') id: string) {
        await this.routeService.deleteVehicle(id);

        return {
            status: 'success',
            message: 'Vehicle deleted successfully',
        };
    }

    // ========== ROUTES ==========

    @Post()
    @ApiOperation({ summary: 'Create a new route' })
    @ApiResponse({
        status: 201,
        description: 'Route created successfully',
        type: RouteEntityApiResponse,
    })
    @SerializeOptions({ type: RouteEntityApiResponse, strategy: 'excludeAll' })
    async createRoute(
        @Body() dto: CreateRouteDto,
    ): Promise<RouteEntityApiResponse> {
        const data = await this.routeService.createRoute(dto);

        return {
            status: 'success',
            message: 'Route created successfully',
            data,
        };
    }

    @Get()
    @ApiOperation({ summary: 'List all routes' })
    @ApiResponse({
        status: 200,
        description: 'List of routes',
        type: RouteListApiResponse,
    })
    @SerializeOptions({ type: RouteListApiResponse, strategy: 'excludeAll' })
    async listRoutes(
        @Query() query: GetRoutesDto,
    ): Promise<RouteListApiResponse> {
        const data = await this.routeService.listRoutes(query);

        return {
            status: 'success',
            message: 'Routes retrieved successfully',
            data,
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get route by ID' })
    @ApiResponse({
        status: 200,
        description: 'Route details',
        type: RouteEntityApiResponse,
    })
    @SerializeOptions({ type: RouteEntityApiResponse, strategy: 'excludeAll' })
    async getRoute(@Param('id') id: string): Promise<RouteEntityApiResponse> {
        const data = await this.routeService.getRoute(id);

        return {
            status: 'success',
            message: 'Route retrieved successfully',
            data,
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update route' })
    @ApiResponse({
        status: 200,
        description: 'Route updated successfully',
        type: RouteEntityApiResponse,
    })
    @SerializeOptions({ type: RouteEntityApiResponse, strategy: 'excludeAll' })
    async updateRoute(
        @Param('id') id: string,
        @Body() dto: UpdateRouteDto,
    ): Promise<RouteEntityApiResponse> {
        const data = await this.routeService.updateRoute(id, dto);

        return {
            status: 'success',
            message: 'Route updated successfully',
            data,
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete route' })
    @ApiResponse({
        status: 200,
        description: 'Route deleted successfully',
    })
    async deleteRoute(@Param('id') id: string) {
        await this.routeService.deleteRoute(id);

        return {
            status: 'success',
            message: 'Route deleted successfully',
        };
    }

    // ========== ROUTE STOPS ==========

    @Post(':routeId/stops')
    @ApiOperation({ summary: 'Add a stop to a route' })
    @ApiResponse({
        status: 201,
        description: 'Route stop created successfully',
        type: RouteStopEntityApiResponse,
    })
    @SerializeOptions({
        type: RouteStopEntityApiResponse,
        strategy: 'excludeAll',
    })
    async createRouteStop(
        @Param('routeId') routeId: string,
        @Body() dto: CreateRouteStopDto,
    ): Promise<RouteStopEntityApiResponse> {
        const data = await this.routeService.createRouteStop(routeId, dto);

        return {
            status: 'success',
            message: 'Route stop created successfully',
            data,
        };
    }

    @Get(':routeId/stops')
    @ApiOperation({ summary: 'List all stops for a route' })
    @ApiResponse({
        status: 200,
        description: 'List of route stops',
        type: RouteStopListApiResponse,
    })
    @SerializeOptions({
        type: RouteStopListApiResponse,
        strategy: 'excludeAll',
    })
    async listRouteStops(
        @Param('routeId') routeId: string,
    ): Promise<RouteStopListApiResponse> {
        const data = await this.routeService.listRouteStops(routeId);

        return {
            status: 'success',
            message: 'Route stops retrieved successfully',
            data,
        };
    }

    @Patch(':routeId/stops/:stopId')
    @ApiOperation({ summary: 'Update a route stop' })
    @ApiResponse({
        status: 200,
        description: 'Route stop updated successfully',
        type: RouteStopEntityApiResponse,
    })
    @SerializeOptions({
        type: RouteStopEntityApiResponse,
        strategy: 'excludeAll',
    })
    async updateRouteStop(
        @Param('routeId') routeId: string,
        @Param('stopId') stopId: string,
        @Body() dto: UpdateRouteStopDto,
    ): Promise<RouteStopEntityApiResponse> {
        const data = await this.routeService.updateRouteStop(stopId, dto);

        return {
            status: 'success',
            message: 'Route stop updated successfully',
            data,
        };
    }

    @Delete(':routeId/stops/:stopId')
    @ApiOperation({ summary: 'Delete a route stop' })
    @ApiResponse({
        status: 200,
        description: 'Route stop deleted successfully',
    })
    async deleteRouteStop(
        @Param('routeId') routeId: string,
        @Param('stopId') stopId: string,
    ) {
        await this.routeService.deleteRouteStop(stopId);

        return {
            status: 'success',
            message: 'Route stop deleted successfully',
        };
    }
}
