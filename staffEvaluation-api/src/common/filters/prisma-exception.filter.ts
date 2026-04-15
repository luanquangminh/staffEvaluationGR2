import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

type PrismaMapping = { status: number; message: string };

const KNOWN_REQUEST_ERRORS: Record<string, PrismaMapping> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Duplicate value violates unique constraint',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Foreign key constraint failed',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'Record not found',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Relation constraint violated',
  },
};

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';
    let code: string | undefined;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
      const mapping = KNOWN_REQUEST_ERRORS[exception.code];
      if (mapping) {
        status = mapping.status;
        message = mapping.message;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid query parameters';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} ${code ?? ''}`,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: 'PrismaError',
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
