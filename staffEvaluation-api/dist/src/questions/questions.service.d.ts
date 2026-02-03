import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/questions.dto';
export declare class QuestionsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        title: string;
        description: string | null;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        title: string;
        description: string | null;
    }>;
    create(dto: CreateQuestionDto): Promise<{
        id: number;
        title: string;
        description: string | null;
    }>;
    update(id: number, dto: UpdateQuestionDto): Promise<{
        id: number;
        title: string;
        description: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        title: string;
        description: string | null;
    }>;
}
