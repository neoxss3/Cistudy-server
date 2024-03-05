import { CourseMySqlEntity } from "@database"
import { Injectable } from "@nestjs/common"
import { Repository, DataSource } from "typeorm"
import {
    FindManySelfCreatedCoursesInput,
} from "./profile.input"
import { InjectRepository } from "@nestjs/typeorm"
import { FindManySelfCreatedCoursesOutputData } from "./profile.output"
@Injectable()
export class ProfileService {
    constructor(
    @InjectRepository(CourseMySqlEntity)
    private readonly courseMySqlRepository: Repository<CourseMySqlEntity>,
    private readonly dataSource: DataSource,
    ) {}

    async findManySelfCreatedCourses(
        input: FindManySelfCreatedCoursesInput,
    ): Promise<FindManySelfCreatedCoursesOutputData> {
        const { data, userId } = input
        const { options } = data

        
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const take = options?.take
            const skip = options?.skip

            const courses =  await this.courseMySqlRepository.find({
                where: {
                    creatorId: userId,
                },
                take,
                skip,
            })
            
            const numberOfCoursesResult = await queryRunner.manager
                .createQueryBuilder()
                .select("COUNT(*)", "count")
                .from(CourseMySqlEntity, "course")
                .where("creatorId = :creatorId", { creatorId: userId })
                .getRawOne()

            await queryRunner.commitTransaction()

            return {
                results: courses,
                metadata: {
                    count: numberOfCoursesResult.count
                }
            }
        } catch (ex) {
            await queryRunner.rollbackTransaction()
        } finally {
            await queryRunner.release()
        }
    }
}
