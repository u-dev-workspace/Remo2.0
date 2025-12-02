import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCompanyDto,
  AddCompanyEmployeeDto,
  UpdateCompanyEmployeeRoleDto,
  UpdateCompanyEmployeePositionDto,
} from './dto/create-company.dto';
import { CompanyRole, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';


@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создание компании:
   *  - создаём Company (manager = creatorUserId)
   *  - создаём CompanyEmployee с ролью HEAD для создателя
   */
  async createCompany(dto: CreateCompanyDto, creatorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. создаём компанию и указываем manager (userId)
      const company = await tx.company.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          purpose: dto.purpose,
          userId: creatorUserId,
        },
      });

      // 2. создатель становится HEAD-сотрудником компании
      await tx.companyEmployee.create({
        data: {
          companyId: company.id,
          userId: creatorUserId,
          role: CompanyRole.HEAD,
          isActive: true,
        },
      });

      return company;
    });
  }

  // ==================== СОТРУДНИКИ ====================

  /**
   * Добавить сотрудника в компанию по email.
   *
   * Если User с таким email не существует:
   *  - создаём пользователя
   *  - генерируем пароль
   *  - сохраняем hash в passwordHash
   *
   * В ответе можно отдать сгенерированный пароль (для показа/отправки на почту).
   */
  async addEmployeeToCompany(
    companyId: string,
    dto: AddCompanyEmployeeDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }

    // 1. ищем пользователя по email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    let generatedPassword: string | null = null;

    // 2. если пользователя нет — создаём нового
    if (!user) {
      generatedPassword = randomBytes(6).toString('hex'); // 12 символов hex
      const passwordHash = await argon2.hash(generatedPassword);

      const nameFromEmail = dto.email.split('@')[0];

      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name || nameFromEmail,
          passwordHash,
          role: UserRole.BUSINESS, // сотрудник компании — бизнес-пользователь
        },
      });
    }

    // 3. проверяем, не добавлен ли уже в эту компанию
    const existingEmployee = await this.prisma.companyEmployee.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: user.id,
        },
      },
    });

    if (existingEmployee) {
      throw new BadRequestException(
        'Этот пользователь уже является сотрудником компании',
      );
    }

    // 4. создаём CompanyEmployee
    const employee = await this.prisma.companyEmployee.create({
      data: {
        companyId,
        userId: user.id,
        role: dto.role ?? CompanyRole.EMPLOYEE,
        position: dto.position ?? null,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    // Можно вернуть пароль, чтобы ты дальше сам решил:
    // показывать его в ответе, логировать или сразу отправлять на email.
    return {
      employee,
      user,
      password: generatedPassword, // null, если юзер уже существовал
    };
  }

  /**
   * Удаление сотрудника.
   * (по желанию можно запретить удалять HEAD — владелца компании)
   */
  async removeEmployee(employeeId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    if (employee.role === CompanyRole.HEAD) {
      throw new BadRequestException(
        'Нельзя удалить владельца (HEAD) компании',
      );
    }

    return this.prisma.companyEmployee.delete({
      where: { id: employeeId },
    });
  }

  /**
   * Обновление роли сотрудника (HEAD / MANAGEMENT / EMPLOYEE).
   */
  async updateEmployeeRole(
    employeeId: string,
    dto: UpdateCompanyEmployeeRoleDto,
  ) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    // (опционально) защита: не давать просто так менять HEAD и т.п.
    return this.prisma.companyEmployee.update({
      where: { id: employeeId },
      data: {
        role: dto.role,
      },
    });
  }

  /**
   * Обновление должности сотрудника (position).
   */
  async updateEmployeePosition(
    employeeId: string,
    dto: UpdateCompanyEmployeePositionDto,
  ) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    return this.prisma.companyEmployee.update({
      where: { id: employeeId },
      data: {
        position: dto.position,
      },
    });
  }

  /**
   * (опционально) Получить сотрудников компании.
   */
  async listCompanyEmployees(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }

    return this.prisma.companyEmployee.findMany({
      where: { companyId },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
