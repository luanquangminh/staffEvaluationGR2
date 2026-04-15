import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ method: 'GET', url: '/test' }),
      }),
    } as unknown as ArgumentsHost;
  });

  const makeKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('msg', {
      code,
      clientVersion: 'test',
    });

  it('maps P2002 to 409 Conflict', () => {
    filter.catch(makeKnownError('P2002'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: 'P2002',
        error: 'PrismaError',
      }),
    );
  });

  it('maps P2025 to 404 Not Found', () => {
    filter.catch(makeKnownError('P2025'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, code: 'P2025' }),
    );
  });

  it('maps P2003 to 400 Bad Request', () => {
    filter.catch(makeKnownError('P2003'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, code: 'P2003' }),
    );
  });

  it('maps P2014 to 400 Bad Request', () => {
    filter.catch(makeKnownError('P2014'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('falls back to 500 for unmapped Prisma codes', () => {
    filter.catch(makeKnownError('P9999'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'P9999',
        message: 'Database error',
      }),
    );
  });

  it('maps PrismaClientValidationError to 400', () => {
    const err = new Prisma.PrismaClientValidationError('invalid query', {
      clientVersion: 'test',
    });
    filter.catch(err, host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid query parameters',
      }),
    );
  });
});
