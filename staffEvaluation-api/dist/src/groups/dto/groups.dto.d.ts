export declare class CreateGroupDto {
    name: string;
    organizationunitid?: number;
}
export declare class UpdateGroupDto extends CreateGroupDto {
}
export declare class UpdateGroupMembersDto {
    staffIds: number[];
}
