import { Module } from '@nestjs/common';
import { CorreiosController } from './correios.controller';
import { CorreiosService } from './correios.service';

@Module({
  controllers: [CorreiosController],
  providers: [CorreiosService],
})
export class IntegrationsModule {}
