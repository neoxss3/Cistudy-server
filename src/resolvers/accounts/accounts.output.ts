import { AuthTokens, AuthOutput, ResultsWithMetadata } from "@common"
import { AccountMySqlEntity, AccountReviewMySqlEntity } from "@database"
import { ObjectType, Int, Field } from "@nestjs/graphql"
import { ReportModel } from "src/database/abstract/report.abstract"




@ObjectType()
export class FindManyAccountsOutputMetadata {
    @Field(() => Int, { nullable: true })
        count?: number
}

@ObjectType()
export class FindManyAccountsOutputData
implements ResultsWithMetadata<AccountMySqlEntity, FindManyAccountsOutputMetadata>
{
    @Field(() => [AccountMySqlEntity])
        results: Array<AccountMySqlEntity>
    @Field(() => FindManyAccountsOutputMetadata, { nullable: true })
        metadata: FindManyAccountsOutputMetadata
}

@ObjectType()
export class FindManyAccountsOutput implements AuthOutput<FindManyAccountsOutputData> {
    @Field(() => FindManyAccountsOutputData)
        data: FindManyAccountsOutputData
    @Field(() => AuthTokens, { nullable: true })
        tokens: AuthTokens
}

@ObjectType()
export class FindManyAccountReviewsOutputMetadata {
    @Field(() => Int, { nullable: true })
        count?: number
}

@ObjectType()
export class FindManyAccountReviewsOutputData
implements ResultsWithMetadata<AccountReviewMySqlEntity, FindManyAccountReviewsOutputMetadata>
{
    @Field(() => [AccountReviewMySqlEntity])
        results: Array<AccountReviewMySqlEntity>
    @Field(() => FindManyAccountReviewsOutputMetadata, { nullable: true })
        metadata: FindManyAccountReviewsOutputMetadata
}

@ObjectType()
export class FindManyAccountReviewsOutput implements AuthOutput<FindManyAccountReviewsOutputData> {
    @Field(() => FindManyAccountReviewsOutputData)
        data: FindManyAccountReviewsOutputData
    @Field(() => AuthTokens, { nullable: true })
        tokens?: AuthTokens
}

@ObjectType()
export class FindManyReportOutputMetadata {
    @Field(() => Int, { nullable: true })
        count?: number
}

@ObjectType()
export class FindManyReportOutputData
implements ResultsWithMetadata<ReportModel, FindManyReportOutputMetadata>
{
    @Field(() => [ReportModel])
        results: Array<ReportModel>
    @Field(() => FindManyReportOutputMetadata, { nullable: true })
        metadata: FindManyReportOutputMetadata
}

@ObjectType()
export class FindManyReportOutput implements AuthOutput<FindManyReportOutputData> {
    @Field(() => FindManyReportOutputData)
        data: FindManyReportOutputData
    @Field(() => AuthTokens, { nullable: true })
        tokens?: AuthTokens
}
