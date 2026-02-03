export declare class BulkEvaluationDto {
    groupId: number;
    victimId: number;
    evaluations: Record<number, number>;
}
export declare class EvaluationQueryDto {
    groupId?: number;
    reviewerId?: number;
    victimId?: number;
}
