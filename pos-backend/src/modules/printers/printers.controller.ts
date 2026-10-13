import { Controller } from '@nestjs/common';
import { PrintersService } from './printers.service.js';

@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}
}
