import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CorreiosService } from './correios.service';

@ApiTags('integrations/correios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations/correios')
export class CorreiosController {
  constructor(private readonly correiosService: CorreiosService) {}

  @Get('status')
  status() {
    return this.correiosService.getStatus();
  }

  @Get('cep')
  lookupCep(@Query('cep') cep: string) {
    return this.correiosService.lookupCep(cep);
  }
}
