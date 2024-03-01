import { Injectable, NotFoundException } from "@nestjs/common"
import {
    CourseMySqlEntity,
    CourseTargetMySqlEntity,
    LectureMySqlEntity,
    ResourceMySqlEntity,
    SectionMySqlEntity,
} from "@database"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { StorageService } from "@global"
import {
    CreateCourseInput,
    CreateSectionInput,
    CreateLectureInput,
    UpdateCourseInput,
    CreateCourseTargetInput,
    UpdateCourseTargetInput,
    DeleteCourseTargetInput,
    CreateResourcesInput,
    UpdateLectureInput,
    DeleteLectureInput,
} from "./courses.input"
import { ProcessMpegDashProducer } from "@workers"
import { DeepPartial } from "typeorm"
import { ProcessStatus, VideoType, existKeyNotUndefined } from "@common"
import { CreateCourseOutput } from "./courses.output"

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(CourseMySqlEntity)
        private readonly courseMySqlRepository: Repository<CourseMySqlEntity>,
        @InjectRepository(SectionMySqlEntity)
        private readonly sectionMySqlRepository: Repository<SectionMySqlEntity>,
        @InjectRepository(LectureMySqlEntity)
        private readonly lectureMySqlRepository: Repository<LectureMySqlEntity>,
        @InjectRepository(CourseTargetMySqlEntity)
        private readonly courseTargetMySqlRepository: Repository<CourseTargetMySqlEntity>,
        @InjectRepository(ResourceMySqlEntity)
        private readonly resourceMySqlRepository: Repository<ResourceMySqlEntity>,
        private readonly storageService: StorageService,
        private readonly mpegDashProcessorProducer: ProcessMpegDashProducer,
    ) { }

    async createCourse(input: CreateCourseInput): Promise<CreateCourseOutput> {
        const { userId } = input
        const created = await this.courseMySqlRepository.save({
            creatorId: userId,
        })

        if (created)
            return {
                courseId: created.courseId
            }
    }

    async updateCourse(input: UpdateCourseInput): Promise<string> {
        const { data, files } = input
        const {
            thumbnailIndex,
            previewVideoIndex,
            courseId,
            description,
            price,
            title,
        } = data

        const course: DeepPartial<CourseMySqlEntity> = {
            description,
            price,
            title,
        }

        const promises: Array<Promise<void>> = []

        const { previewVideoId, thumbnailId } =
            await this.courseMySqlRepository.findOneBy({ courseId })

        if (Number.isInteger(previewVideoIndex)) {
            const promise = async () => {
                const file = files.at(previewVideoIndex)
                if (previewVideoId) {
                    await this.storageService.update(thumbnailId, {
                        rootFile: file,
                    })
                } else {
                    const { assetId } = await this.storageService.upload({
                        rootFile: file,
                    })
                    course.previewVideoId = assetId
                }
            }
            promises.push(promise())
        }

        if (Number.isInteger(thumbnailIndex)) {
            const promise = async () => {
                const file = files.at(thumbnailIndex)
                if (thumbnailId) {
                    await this.storageService.update(thumbnailId, {
                        rootFile: file,
                    })
                } else {
                    const { assetId } = await this.storageService.upload({
                        rootFile: file,
                    })
                    course.thumbnailId = assetId
                }
            }
            promises.push(promise())
        }
        await Promise.all(promises)

        if (existKeyNotUndefined(course))
            await this.courseMySqlRepository.update(courseId, course)
        return `A course wth id ${courseId} has been updated successfully`
    }

    async createSection(input: CreateSectionInput): Promise<string> {
        const { courseId, title } = input.data
        const course = await this.courseMySqlRepository.findOneBy({
            courseId,
        })
        if (!course) throw new NotFoundException("Course not found.")
        const created = await this.sectionMySqlRepository.save({
            courseId,
            title,
        })
        if (created)
            return `A section with id ${created.sectionId} has been created successfully.`
    }

    async createLecture(input: CreateLectureInput): Promise<string> {
        const { title, sectionId } = input.data

        const created = await this.lectureMySqlRepository.save({
            title,
            sectionId,
        })

        if (created)
            return `A lecture with id ${created.lectureId} has been creeated successfully.`
    }

    async updateLecture(input: UpdateLectureInput): Promise<string> {
        const { data, files } = input
        const { lectureId, title, lectureVideoIndex, thumbnailIndex } = data

        const { thumbnailId, lectureVideoId } =
            await this.lectureMySqlRepository.findOneBy({ lectureId })

        const promises: Array<Promise<void>> = []

        const lecture: DeepPartial<LectureMySqlEntity> = { title }

        if (Number.isInteger(lectureVideoIndex)) {
            const promise = async () => {
                const file = files.at(lectureVideoIndex)

                await this.lectureMySqlRepository.update(
                    { lectureId },
                    {
                        processStatus: ProcessStatus.Pending,
                    },
                )

                const queryAtStart = this.lectureMySqlRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        processStatus: ProcessStatus.Processing,
                    })
                    .where({
                        lectureId,
                    })
                    .getQueryAndParameters()

                const queryAtEnd = this.lectureMySqlRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        processStatus: ProcessStatus.Completed,
                        videoType: VideoType.DASH
                    })
                    .andWhere({
                        lectureId,
                    })
                    .getQueryAndParameters()

                let assetId: string
                if (lectureVideoId) {
                    await this.storageService.update(lectureVideoId, {
                        rootFile: file,
                    })
                    assetId = lectureVideoId
                } else {
                    const { assetId: createdAssetId } = await this.storageService.upload({
                        rootFile: file,
                    })
                    lecture.lectureVideoId = createdAssetId
                    assetId = createdAssetId
                }

                await this.mpegDashProcessorProducer.add({
                    assetId,
                    file,
                    callbackQueries: {
                        queryAtStart,
                        queryAtEnd,
                    },
                })
            }
            promises.push(promise())
        }

        if (Number.isInteger(thumbnailIndex)) {
            const promise = async () => {
                const file = files.at(thumbnailIndex)
                if (thumbnailId) {
                    await this.storageService.update(thumbnailId, {
                        rootFile: file,
                    })
                } else {
                    const { assetId } = await this.storageService.upload({
                        rootFile: file,
                    })
                    lecture.thumbnailId = assetId
                }
            }
            promises.push(promise())
        }
        await Promise.all(promises)

        if (existKeyNotUndefined(lecture))
            await this.lectureMySqlRepository.update(lectureId, lecture)
        return `A lecture with id ${lectureId} has been updated successfully.`
    }

    async deleteLecture(input: DeleteLectureInput): Promise<string> {
        const { lectureId } = input.data
        await this.lectureMySqlRepository.delete({ lectureId })
        return `A lecture with id ${lectureId} has been deleted successfully.`
    }

    async createCourseTarget(input: CreateCourseTargetInput): Promise<string> {
        const { content, courseId } = input.data
        const maxPosition = await this.courseTargetMySqlRepository.createQueryBuilder()
            .select("MAX(position)", "result").getRawOne()
        const max = maxPosition.result as number

        const created = await this.courseTargetMySqlRepository.save({
            courseId,
            content,
            position: max + 1,
        })
        if (created)
            return `A course target with id ${created.courseTargetId} has been created successfully.`
    }

    async updateCourseTarget(input: UpdateCourseTargetInput): Promise<string> {
        const { content, courseTargetId } = input.data
        await this.courseTargetMySqlRepository.update(courseTargetId, {
            content,
        })
        return `A course target with id ${courseTargetId} has been updated successfully.`
    }

    async deleteCourseTarget(input: DeleteCourseTargetInput): Promise<string> {
        const { courseTargetId } = input.data
        await this.courseTargetMySqlRepository.delete({ courseTargetId })
        return `A course target with id ${courseTargetId} has been deleted successfully.`
    }

    async createResources(input: CreateResourcesInput): Promise<string> {
        const { files, data } = input
        const { lectureId } = data

        const promises: Array<Promise<void>> = []
        const resources: Array<DeepPartial<ResourceMySqlEntity>> = []

        for (const file of files) {
            const promise = async () => {
                const { assetId } = await this.storageService.upload({
                    rootFile: file,
                })
                resources.push({
                    name: file.originalname,
                    fileId: assetId,
                    lectureId,
                })
            }
            promises.push(promise())
        }
        await Promise.all(promises)

        await this.resourceMySqlRepository.save(resources)
        return `Resources with ids ${resources.map((resource) => resource.resourceId)} has been created successfully.`
    }
}
