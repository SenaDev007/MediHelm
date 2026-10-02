import { Controller, Get } from '@nestjs/common'

interface HealthResponse {
  status: 'ok'
  service: 'medihelm-api'
  timestamp: string
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'medihelm-api',
      timestamp: new Date().toISOString(),
    }
  }
}
