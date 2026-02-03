import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/questions.dto';
export declare class QuestionsController {
    private questionsService;
    constructor(questionsService: QuestionsService);
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
