import { ConflictException, Injectable, NotFoundException, InternalServerErrorException, ConsoleLogger } from "@nestjs/common"
import {
    CategoryMySqlEntity,
    CertificateMySqlEntity,
    CourseMySqlEntity,
    CourseReviewMySqlEntity,
    CourseSubcategoryMySqlEntity,
    CourseTargetMySqlEntity,
    CourseTopicMySqlEntity,
    LessonMySqlEntity,
    QuizQuestionAnswerMySqlEntity,
    QuizMySqlEntity,
    ResourceMySqlEntity,
    SectionMySqlEntity,
    SubcategoyMySqlEntity,
    TopicMySqlEntity,
    QuizQuestionMySqlEntity,
    QuizQuestionMediaMySqlEntity,
    ProgressMySqlEntity,
    QuizAttemptMySqlEntity,
    AccountMySqlEntity,
} from "@database"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository, DataSource, In } from "typeorm"
import { StorageService } from "@global"
import {
    CreateCourseInput,
    CreateSectionInput,
    CreateLessonInput,
    UpdateCourseInput,
    CreateCourseTargetInput,
    UpdateCourseTargetInput,
    DeleteCourseTargetInput,
    CreateResourcesInput,
    UpdateLessonInput,
    DeleteLessonInput,
    DeleteSectionInput,
    UpdateSectionInput,
    DeleteResourceInput,
    EnrollCourseInput,
    CreateCategoryInput,
    CreateSubcategoryInput,
    CreateTopicInput,
    DeleteTopicInput,
    CreateCourseReviewInput,
    UpdateCourseReviewInput,
    DeleteCourseReviewInput,
    CreateCertificateInput,
    CreateQuizInput,

    UpdateQuizInput,
    MarkLessonAsCompletedInput,
    CreateQuizAttemptInput,
    FinishQuizAttemptInput,
    GiveAwayCourseInput,



} from "./courses.input"
import { ProcessMpegDashProducer } from "@workers"
import { DeepPartial } from "typeorm"
import { ProcessStatus, QuizAttemptStatus, VideoType, existKeyNotUndefined } from "@common"
import { CreateCategoryOutput, CreateCertificateOutput, CreateCourseOutput, CreateCourseReviewOutput, CreateQuizAttemptOutput, CreateSubcategoryOutput, CreateTopicOutput, DeleteCourseReviewOutput, DeleteQuizOutput, DeleteTopicOutputData, EnrollCourseOutput, FinishQuizAttemptOutput, MarkLessonAsCompletedOutput, UpdateCourseOutput, UpdateCourseReviewOutput, UpdateQuizOutput } from "./courses.output"
import { EnrolledInfoEntity } from "../../database/mysql/enrolled-info.entity"
import { QuizQuestionEntity } from "src/database/mysql/quiz-question.entity"

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(CourseMySqlEntity)
        private readonly courseMySqlRepository: Repository<CourseMySqlEntity>,
        @InjectRepository(SectionMySqlEntity)
        private readonly sectionMySqlRepository: Repository<SectionMySqlEntity>,
        @InjectRepository(LessonMySqlEntity)
        private readonly lessonMySqlRepository: Repository<LessonMySqlEntity>,
        @InjectRepository(CourseTargetMySqlEntity)
        private readonly courseTargetMySqlRepository: Repository<CourseTargetMySqlEntity>,
        @InjectRepository(ResourceMySqlEntity)
        private readonly resourceMySqlRepository: Repository<ResourceMySqlEntity>,
        @InjectRepository(EnrolledInfoEntity)
        private readonly enrolledInfoMySqlRepository: Repository<EnrolledInfoEntity>,
        @InjectRepository(CourseSubcategoryMySqlEntity)
        private readonly courseSubcategoryMySqlRepository: Repository<CourseSubcategoryMySqlEntity>,
        @InjectRepository(CourseTopicMySqlEntity)
        private readonly courseTopicMySqlRepository: Repository<CourseTopicMySqlEntity>,
        @InjectRepository(CategoryMySqlEntity)
        private readonly categoryMySqlRepository: Repository<CategoryMySqlEntity>,
        @InjectRepository(SubcategoyMySqlEntity)
        private readonly subcategoryMySqlRepository: Repository<SubcategoyMySqlEntity>,
        @InjectRepository(TopicMySqlEntity)
        private readonly topicMySqlRepository: Repository<TopicMySqlEntity>,
        @InjectRepository(CourseReviewMySqlEntity)
        private readonly courseReviewMySqlRepository: Repository<CourseReviewMySqlEntity>,
        @InjectRepository(CertificateMySqlEntity)
        private readonly courseCertificateMySqlEntity: Repository<CertificateMySqlEntity>,
        @InjectRepository(QuizMySqlEntity)
        private readonly quizMySqlRepository: Repository<QuizMySqlEntity>,
        @InjectRepository(QuizQuestionMySqlEntity)
        private readonly quizQuestionMySqlRepository: Repository<QuizQuestionMySqlEntity>,
        @InjectRepository(QuizQuestionAnswerMySqlEntity)
        private readonly quizQuestionAnswerMySqlRepository: Repository<QuizQuestionAnswerMySqlEntity>,
        @InjectRepository(QuizQuestionMediaMySqlEntity)
        private readonly quizQuestionMediaMySqlRepository: Repository<QuizQuestionMediaMySqlEntity>,
        @InjectRepository(ProgressMySqlEntity)
        private readonly progressMySqlRepository: Repository<ProgressMySqlEntity>,
        @InjectRepository(QuizAttemptMySqlEntity)
        private readonly quizAttemptMySqlRepository: Repository<QuizAttemptMySqlEntity>,
        @InjectRepository(AccountMySqlEntity)
        private readonly accountMySqlRepository: Repository<AccountMySqlEntity>,
        // @InjectModel(TransactionMongoEntity.name) private readonly transactionMongoModel: Model<TransactionMongoEntity>,
        // @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly storageService: StorageService,
        private readonly mpegDashProcessorProducer: ProcessMpegDashProducer,
        private readonly dataSource: DataSource
    ) { }

    async enrollCourse(input: EnrollCourseInput): Promise<EnrollCourseOutput> {
        const { data, accountId } = input
        const { courseId } = data

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const found = await this.enrolledInfoMySqlRepository.findOne({
                where: {
                    accountId, courseId
                }
            }
            )

            if (found?.enrolled) throw new ConflictException("You have enrolled to this course.")

            // const cachedTransaction = (await this.cacheManager.get(code)) as CodeValue
            // if (!cachedTransaction) throw new NotFoundException("The code either expired or never existed.")

            // const { transactionHash } = cachedTransaction
            // const transaction = await this.transactionMongoModel.findOne({
            //     transactionHash
            // })
            // if (!transaction) {
            //     throw new NotFoundException("Transaction not found.")
            // }

            // const { _id, isValidated, value } = transaction

            // if (isValidated) throw new ConflictException("This transaction is validated.")

            const { enableDiscount, discountPrice, price: coursePrice, title } = await this.courseMySqlRepository.findOne({
                where: {
                    courseId
                }
            }
            )

            const price = enableDiscount ? discountPrice : coursePrice
            // if (BigInt(value) < computeRaw(price)) throw new ConflictException("Value is not enough.")

            // await this.transactionMongoModel.findOneAndUpdate({ _id }, {
            //     isValidated: true
            // },
            // )

            const { enrolledInfoId } = await this.enrolledInfoMySqlRepository.save({
                enrolledInfoId: found?.enrolledInfoId,
                courseId,
                accountId,
                enrolled: true,
                priceAtEnrolled: price
            })
            const course = await this.courseMySqlRepository.findOne({
                where: {
                    courseId
                },
                relations: {
                    sections: {
                        lessons: true
                    }
                }
            });

            const progresses = course.sections.reduce((acc, section) => {
                section.lessons.forEach(lesson => {
                    acc.push({
                        accountId,
                        lessonId: lesson.lessonId,
                        isCompleted: false // Giả sử bạn muốn khởi tạo với `isCompleted` là false
                    });
                });
                return acc;
            }, []);

            await this.progressMySqlRepository.save(progresses);

            await queryRunner.commitTransaction()

            return {
                message: "Enrolled to Course " + title,
                others: { enrolledInfoId }
            }

        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }
    }

    async createCourse(input: CreateCourseInput): Promise<CreateCourseOutput> {
        const { accountId } = input
        const created = await this.courseMySqlRepository.save({
            creatorId: accountId,
        })

        if (created)
            return {
                message: "Course " + created.title + "created Successfully",
                others: { courseId: created.courseId }
            }
    }

    async updateCourse(input: UpdateCourseInput): Promise<UpdateCourseOutput> {
        const { data, files } = input
        const {
            thumbnailIndex,
            previewVideoIndex,
            courseId,
            description,
            price,
            discountPrice,
            enableDiscount,
            title,
            categoryId,
            subcategoryIds,
            topicIds,
            receivedWalletAddress
        } = data

        const course: DeepPartial<CourseMySqlEntity> = {
            courseId,
            description,
            title,
            price,
            discountPrice,
            enableDiscount,
            receivedWalletAddress,
            categoryId,
            courseSubcategories: subcategoryIds?.map(subcategoryId => ({
                subcategoryId,
                courseId
            })),
            courseTopics: topicIds?.map(topicId => ({
                topicId
            })),
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

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            if (subcategoryIds?.length)
                await this.courseSubcategoryMySqlRepository.delete({ courseId })

            if (topicIds?.length)
                await this.courseTopicMySqlRepository.delete({ courseId })

            if (existKeyNotUndefined(course))
                await this.courseMySqlRepository.save(course)

            await queryRunner.commitTransaction()

            return { message: "Course Updated Successfully" }
        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }
    }

    async createCourseReview(input: CreateCourseReviewInput): Promise<CreateCourseReviewOutput> {
        const { data, accountId } = input;
        const { courseId, content, rating } = data;

        const reviewed = await this.courseReviewMySqlRepository.findOne({
            where: { accountId, courseId }
        });

        if (reviewed) {
            throw new ConflictException("This user already has a review on this course");
        }

        try {
            const result = await this.courseReviewMySqlRepository.save({
                courseId,
                accountId,
                content,
                rating,
            });

            if (result) {
                return { message: "Review Created Successfully" };
            }
        } catch (error) {
            throw new InternalServerErrorException("Failed due to system error")
        }
    }

    async updateCourseReview(input: UpdateCourseReviewInput): Promise<UpdateCourseReviewOutput> {
        const { data, accountId } = input;
        const { content, rating, courseReviewId } = data;

        const reviewed = await this.courseReviewMySqlRepository.findOne({ where: { courseReviewId, accountId } });
        if (!reviewed) {
            throw new NotFoundException("This review is not found or not owned by sender.")
        }

        if (content || rating) {
            await this.courseReviewMySqlRepository.update(courseReviewId, {
                content,
                rating
            });
            return { message: "Review Updated Successfully" }
        }
        return { message: "No update were made." }

    }

    async deleteCourseReview(input: DeleteCourseReviewInput): Promise<DeleteCourseReviewOutput> {
        const { data, accountId } = input;
        const { courseReviewId } = data;

        const reviewed = await this.courseReviewMySqlRepository.findOne({
            where: {
                courseReviewId,
                accountId
            }
        });

        if (!reviewed) {
            // nó chỉ quăng lỗi khi mà cái review không tìm thấy hoặc nó không thuộc về người đó
            throw new NotFoundException("This review is not found or not owned by sender.");
        }

        await this.courseReviewMySqlRepository.delete({ courseReviewId });

        return { message: "Review deleted successfully" }
    }

    async createSection(input: CreateSectionInput): Promise<string> {
        const { data } = input
        const { courseId, title } = data
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

    async createLesson(input: CreateLessonInput): Promise<string> {
        const { title, sectionId } = input.data

        const created = await this.lessonMySqlRepository.save({
            title,
            sectionId,
        })

        if (created)
            return `A lesson with id ${created.lessonId} has been creeated successfully.`
    }

    async updateLesson(input: UpdateLessonInput): Promise<string> {
        const { data, files } = input
        const { lessonId, title, description, lessonVideoIndex, thumbnailIndex } = data

        const { thumbnailId, lessonVideoId } =
            await this.lessonMySqlRepository.findOneBy({ lessonId })

        const promises: Array<Promise<void>> = []

        const lesson: DeepPartial<LessonMySqlEntity> = { title, description }

        if (Number.isInteger(lessonVideoIndex)) {
            const promise = async () => {
                const file = files.at(lessonVideoIndex)

                await this.lessonMySqlRepository.update(
                    { lessonId },
                    {
                        processStatus: ProcessStatus.Pending,
                    },
                )

                const queryAtStart = this.lessonMySqlRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        processStatus: ProcessStatus.Processing,
                    })
                    .where({
                        lessonId,
                    })
                    .getQueryAndParameters()

                const queryAtEnd = this.lessonMySqlRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        processStatus: ProcessStatus.Completed,
                        videoType: VideoType.DASH
                    })
                    .andWhere({
                        lessonId,
                    })
                    .getQueryAndParameters()

                let assetId: string
                if (lessonVideoId) {
                    await this.storageService.update(lessonVideoId, {
                        rootFile: file,
                    })
                    assetId = lessonVideoId
                } else {
                    const { assetId: createdAssetId } = await this.storageService.upload({
                        rootFile: file,
                    })
                    lesson.lessonVideoId = createdAssetId
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
                    lesson.thumbnailId = assetId
                }
            }
            promises.push(promise())
        }
        await Promise.all(promises)

        if (existKeyNotUndefined(lesson))
            await this.lessonMySqlRepository.update(lessonId, lesson)
        return `A lesson with id ${lessonId} has been updated successfully.`
    }

    async deleteLesson(input: DeleteLessonInput): Promise<string> {
        const { data } = input
        const { lessonId } = data
        await this.lessonMySqlRepository.delete({ lessonId })
        return `A lesson with id ${lessonId} has been deleted successfully.`
    }

    async createCourseTarget(input: CreateCourseTargetInput): Promise<string> {
        const { data } = input
        const { content, courseId } = data
        const maxResult = await this.courseTargetMySqlRepository.createQueryBuilder()
            .select("MAX(position)", "count").getRawOne()
        const max = maxResult.count as number

        const created = await this.courseTargetMySqlRepository.save({
            courseId,
            content,
            position: max + 1,
        })
        if (created)
            return `A course target with id ${created.courseTargetId} has been created successfully.`
    }

    async updateCourseTarget(input: UpdateCourseTargetInput): Promise<string> {
        const { data } = input
        const { content, courseTargetId } = data
        await this.courseTargetMySqlRepository.update(courseTargetId, {
            content,
        })
        return `A course target with id ${courseTargetId} has been updated successfully.`
    }

    async deleteCourseTarget(input: DeleteCourseTargetInput): Promise<string> {
        const { data } = input
        const { courseTargetId } = data
        await this.courseTargetMySqlRepository.delete({ courseTargetId })
        return `A course target with id ${courseTargetId} has been deleted successfully.`
    }

    async createResources(input: CreateResourcesInput): Promise<string> {
        const { files, data } = input
        const { lessonId } = data

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
                    lessonId,
                })
            }
            promises.push(promise())
        }
        await Promise.all(promises)

        await this.resourceMySqlRepository.save(resources)
        return `Resources with ids ${resources.map((resource) => resource.resourceId)} has been created successfully.`
    }

    async updateSection(input: UpdateSectionInput): Promise<string> {
        const { data } = input
        const { sectionId, title } = data
        await this.sectionMySqlRepository.update(sectionId, {
            title,
        })
        return `A section with id  ${sectionId} has been updated successfully.`
    }

    async deleteSection(input: DeleteSectionInput): Promise<string> {
        const { data } = input
        const { sectionId } = data
        await this.sectionMySqlRepository.delete({ sectionId })
        return `A section with id ${sectionId} has been deleted successfully.`
    }

    async deleteResource(input: DeleteResourceInput): Promise<string> {
        const { data } = input
        const { resourceId } = data
        await this.resourceMySqlRepository.delete({ resourceId })
        return `A resource with id ${resourceId} has been deleted successfully.`
    }

    //apis only
    async createCategory(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
        const { data } = input
        const { name } = data

        const created = await this.categoryMySqlRepository.save({
            name
        })

        return {
            message: "Category" + created.name + " Created Successfully",
            others: { categoryId: created.categoryId }
        }
    }

    async createSubcategory(input: CreateSubcategoryInput): Promise<CreateSubcategoryOutput> {
        const { data } = input
        const { name, categoryId } = data

        const { subcategoryId } = await this.subcategoryMySqlRepository.save({
            name,
            categoryId
        })

        return {
            message: "Subcategory Created Successfully",
            others: { subcategoryId }
        }
    }

    async createTopic(input: CreateTopicInput): Promise<CreateTopicOutput> {
        const { data, files } = input
        const { name, subcategoryIds } = data

        const file = files.at(0)
        if (!file) return

        const { assetId } = await this.storageService.upload({
            rootFile: file,
        })

        const { topicId } = await this.topicMySqlRepository.save({
            svgId: assetId,
            name,
            subcategoryTopics: subcategoryIds.map(subcategoryId => ({
                subcategoryId
            }))
        })

        return {
            message: "Topic Created Successfully",
            others: { topicId }
        }
    }

    async deleteTopic(input: DeleteTopicInput): Promise<DeleteTopicOutputData> {
        const { data } = input
        const { topicId } = data

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const { svgId } = await this.topicMySqlRepository.findOneBy({ topicId })
            await this.storageService.delete(svgId)
            await this.topicMySqlRepository.delete({ topicId })
            return { message: "Topic Deleted Successfully" }
        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }
    }

    async createCourseCertificate(input: CreateCertificateInput): Promise<CreateCertificateOutput> {
        const { accountId, data } = input
        const { courseId } = data

        const found = await this.courseCertificateMySqlEntity.findOne({
            where: {
                accountId,
                courseId
            }
        })

        if (found) {
            throw new ConflictException("This user already get certificate of this course")
        }


        const achievedDate = new Date()
        const expireDate = new Date(achievedDate)
        expireDate.setDate(expireDate.getDate() + 90)

        const { certificateId } = await this.courseCertificateMySqlEntity.save({
            accountId,
            courseId,
            achievedDate,
            expireDate
        })

        return {
            message: "Certificate Created Successfully",
            others: {
                certificateId
            }
        }
    }

    async createQuiz(input: CreateQuizInput): Promise<string> {
        const { data, files } = input;
        const { lessonId, quizQuestions, timeLimit } = data;
        //Tìm quiz trong db, nếu chưa có thì tạo mới, nếu có thì chỉ thêm question và answer
        let availableQuiz = await this.quizMySqlRepository.findOneBy({ quizId: lessonId })

        if (!availableQuiz) {
            availableQuiz = await this.quizMySqlRepository.save({ quizId: lessonId, timeLimit })
        }

        if (!quizQuestions || quizQuestions.length === 0) {
            throw new ConflictException("Please provide more than 1 question for the question");
        }

        const questionPromises: Array<Promise<void>> = []

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const questions of quizQuestions) {
                const { questionMedias, answers, question } = questions

                const quizQuestion: DeepPartial<QuizQuestionMySqlEntity> = {
                    quizId: lessonId,
                    question,
                    questionMedias: [],
                }
                if (files) {
                    const mediaPromises: Array<Promise<void>> = []
                    let mediaPosition = 0
                    for (const questionMedia of questionMedias) {
                        const { mediaIndex, mediaType } = questionMedia;

                        const position = mediaPosition;
                        const promise = async () => {
                            const file = files.at(mediaIndex);
                            const { assetId } = await this.storageService.upload({
                                rootFile: file,
                            });
                            quizQuestion.questionMedias.push({
                                position,
                                mediaId: assetId,
                                mediaType,
                            } as QuizQuestionMediaMySqlEntity);
                        };
                        mediaPosition++;
                        mediaPromises.push(promise());
                    }
                    await Promise.all(mediaPromises);
                }

                if (!answers || answers.length < 2) {
                    throw new ConflictException("Question must have at least 2 answers");
                }

                const { quizQuestionId } = await this.quizQuestionMySqlRepository.save(quizQuestion)
                const questionAnswers = answers.map(({ content, isCorrect }) => ({
                    quizQuestionId,
                    content,
                    isCorrect,
                }));

                const hasCorrectAnswer = questionAnswers.some(answer => answer.isCorrect);

                if (!hasCorrectAnswer) {
                    throw new ConflictException("Quiz must have at least 1 correct answer");
                }

                await this.quizQuestionAnswerMySqlRepository.save(questionAnswers)
                questionPromises.push()
            }
            await Promise.all(questionPromises)

            return `A quiz with id ${availableQuiz.quizId} has been created successfully.`;

        } catch (ex) {
            await queryRunner.rollbackTransaction();
            throw ex;
        } finally {
            await queryRunner.release();
        }
    }

    async updateQuiz(input: UpdateQuizInput): Promise<UpdateQuizOutput> {
        const { data, files } = input
        const { quizId, timeLimit, newQuestions, quizQuestionIdsToDelete, quizQuestionIdsToUpdate } = data

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            if (timeLimit) {
                await this.quizMySqlRepository.update(quizId, { timeLimit })
            }

            if (newQuestions) {
                const questionPromises: Array<Promise<void>> = []
                for (const questions of newQuestions) {
                    const { questionMedias, answers, question } = questions
                    const quizQuestion: DeepPartial<QuizQuestionMySqlEntity> = {
                        quizId,
                        question,
                        questionMedias: [],
                    }

                    if (files) {
                        const mediaPromises: Array<Promise<void>> = []
                        let mediaPosition = 0
                        for (const questionMedia of questionMedias) {
                            const { mediaIndex, mediaType } = questionMedia;

                            const position = mediaPosition;
                            const promise = async () => {
                                const file = files.at(mediaIndex);
                                const { assetId } = await this.storageService.upload({
                                    rootFile: file,
                                });
                                quizQuestion.questionMedias.push({
                                    position,
                                    mediaId: assetId,
                                    mediaType,
                                } as QuizQuestionMediaMySqlEntity);
                            };
                            mediaPosition++;
                            mediaPromises.push(promise());
                        }
                        await Promise.all(mediaPromises);
                    }

                    if (!answers || answers.length < 2) {
                        throw new ConflictException("Question must have at least 2 answers");
                    }

                    const { quizQuestionId } = await this.quizQuestionMySqlRepository.save(quizQuestion)
                    const questionAnswers = answers.map(({ content, isCorrect }) => ({
                        quizQuestionId,
                        content,
                        isCorrect,
                    }));

                    const hasCorrectAnswer = questionAnswers.some(answer => answer.isCorrect);

                    if (!hasCorrectAnswer) {
                        throw new ConflictException("Quiz must have at least 1 correct answer");
                    }

                    await this.quizQuestionAnswerMySqlRepository.save(questionAnswers)
                    questionPromises.push()
                }
                await Promise.all(questionPromises)
            }

            if (quizQuestionIdsToDelete) {

                const numberOfQuizQuestions = await queryRunner.manager
                    .createQueryBuilder()
                    .select("COUNT(*)", "count")
                    .from(QuizQuestionMySqlEntity, "quiz-question")
                    .where("quiz-question.quizId = :quizId", { quizId })
                    .getRawOne()

                if (numberOfQuizQuestions.count - quizQuestionIdsToDelete.length < 1) {
                    throw new ConflictException("Quiz must have at least 1 question")
                }

                const deletedQuizQuestionMedias = await this.quizQuestionMediaMySqlRepository.findBy({
                    quizQuestionId: In(quizQuestionIdsToDelete)
                })

                const mediaIds = deletedQuizQuestionMedias.map((quizQuestionMediaIdsToDelete) => quizQuestionMediaIdsToDelete.mediaId)
                await this.storageService.delete(...mediaIds)
                await queryRunner.manager.delete(QuizQuestionMediaMySqlEntity, { mediaId: In(mediaIds) })
                //await this.quizQuestionMediaMySqlRepository.delete({ mediaId: In(mediaIds) })
                await queryRunner.manager.delete(QuizQuestionMySqlEntity, { quizQuestionId: In(quizQuestionIdsToDelete) })
                //await this.quizQuestionMySqlRepository.delete({ quizQuestionId: In(quizQuestionIdsToDelete) })
            }

            if (quizQuestionIdsToUpdate) {
                for (const updateQuestion of quizQuestionIdsToUpdate) {
                    const {
                        quizQuestionId,
                        question,
                        questionMedias,
                        quizAnswerIdsToUpdate,
                        quizAnswerIdsToDelete,
                        newQuizQuestionAnswer,
                        mediaIdsToDelete
                    } = updateQuestion

                    const currentQuestion: DeepPartial<QuizQuestionMySqlEntity> = {
                        quizQuestionId,
                        question,
                    }

                    if (files) {
                        const promises: Array<Promise<void>> = []
                        const mediaToSave = []
                        let mediaPosition = 0
                        for (const media of questionMedias) {
                            const { mediaIndex, mediaType } = media

                            const position = mediaPosition
                            const promise = async () => {
                                const file = files.at(mediaIndex)
                                const { assetId } = await this.storageService.upload({
                                    rootFile: file,
                                })
                                await queryRunner.manager.save(QuizQuestionMediaMySqlEntity, {
                                    quizQuestionId,
                                    mediaId: assetId,
                                    position,
                                    mediaType
                                })
                                // await this.quizQuestionMediaMySqlRepository.save({
                                //     quizQuestionId,
                                //     mediaId: assetId,
                                //     position,
                                //     mediaType
                                // })
                            }
                            mediaPosition++
                            promises.push(promise())
                        }
                        await Promise.all(promises)
                    }

                    if (newQuizQuestionAnswer) {
                        const newQuizAnswers = newQuizQuestionAnswer.map(({ content, isCorrect }) => ({
                            quizQuestionId,
                            content,
                            isCorrect
                        }));

                        //await queryRunner.manager.save(QuizQuestionAnswerMySqlEntity, newQuizAnswers)
                        await this.quizQuestionAnswerMySqlRepository.save(newQuizAnswers)
                    }

                    if (quizAnswerIdsToUpdate) {
                        let updateAnswers = []
                        for (const answer of quizAnswerIdsToUpdate) {
                            updateAnswers.push({
                                quizQuestionAnswerId: answer.quizQuestionAnswerId,
                                content: answer.content,
                                isCorrect: answer.isCorrect
                            })
                        }

                        await queryRunner.manager.save(QuizQuestionAnswerMySqlEntity, updateAnswers)
                    }

                    if (quizAnswerIdsToDelete) {
                        await queryRunner.manager.delete(QuizQuestionAnswerMySqlEntity, { quizQuestionAnswerId: In(quizAnswerIdsToDelete) })
                    }
                    const numberOfCorrectQuizQuestionAnswersResult = await queryRunner.manager
                        .createQueryBuilder()
                        .select("COUNT(*)", "count")
                        .from(QuizQuestionAnswerMySqlEntity, "quiz-question-answer")
                        .where("quiz-question-answer.quizQuestionId = :quizQuestionId", { quizQuestionId })
                        .andWhere("quiz-question-answer.isCorrect = :isCorrect", { isCorrect: true })
                        .getRawOne()
                    const numberOfQuizQuestionAnswersResult = await queryRunner.manager
                        .createQueryBuilder()
                        .select("COUNT(*)", "count")
                        .from(QuizQuestionAnswerMySqlEntity, "quiz-question-answer")
                        .where("quiz-question-answer.quizQuestionId = :quizQuestionId", { quizQuestionId })
                        .getRawOne()

                    if (numberOfQuizQuestionAnswersResult.count < 2) {
                        throw new ConflictException("Question must have at least 2 answers")
                    }
                    console.log(numberOfCorrectQuizQuestionAnswersResult.count)
                    if (numberOfCorrectQuizQuestionAnswersResult.count < 1) {
                        throw new ConflictException("Quiz must have at least 1 correct answer")
                    }

                    if (mediaIdsToDelete) {
                        await this.storageService.delete(...mediaIdsToDelete)
                        await queryRunner.manager.delete(QuizQuestionMediaMySqlEntity, { mediaId: In(mediaIdsToDelete) })
                    }

                    await this.quizQuestionMySqlRepository.save(currentQuestion)
                }
            }
            await queryRunner.commitTransaction()
            return { message: "Quiz Updated Successfully" }
        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }

    }

    async markLessonAsCompleted(input: MarkLessonAsCompletedInput): Promise<MarkLessonAsCompletedOutput> {
        const { data, accountId } = input
        const { lessonId } = data
        await this.progressMySqlRepository.update({ accountId, lessonId }, { isCompleted: true })
        return { message: "User had completed this lesson" }
    }

    async createQuizAttempt(input: CreateQuizAttemptInput): Promise<CreateQuizAttemptOutput> {
        const { data, accountId } = input
        const { quizId } = data

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const doing = await this.quizAttemptMySqlRepository.findOne({
                where: {
                    quizId,
                    accountId,
                    attemptStatus: QuizAttemptStatus.Started
                }
            })

            if (doing) {
                throw new ConflictException("User havent completed the last attempt.")
            }

            // await queryRunner.manager.save(QuizAttemptMySqlEntity, {
            //     quizId,
            //     accountId,
            // })
            const { quizAttemptId } = await this.quizAttemptMySqlRepository.save({ accountId, quizId })
            return {
                message: "Attempt Started Successfully!",
                others: {
                    quizAttemptId
                }
            }
        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }
    }

    async finishQuizAttempt(input: FinishQuizAttemptInput): Promise<FinishQuizAttemptOutput> {
        const { data } = input
        const { quizAttemptId, score } = data

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const attempt = await this.quizAttemptMySqlRepository.findOneBy({ quizAttemptId })

            if (!attempt) {
                throw new NotFoundException("Attempt not found")
            }

            if (attempt.attemptStatus === QuizAttemptStatus.Ended) {
                throw new NotFoundException("Attempt already ended")
            }

            await this.quizAttemptMySqlRepository.update(quizAttemptId, { score, attemptStatus: QuizAttemptStatus.Ended })

            return {
                message: "Quiz ended successfully!",
                others: {
                    score
                }
            }
        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }
    }

    async giveAwayCourse(input: GiveAwayCourseInput): Promise<string> {
        const { accountId, data } = input
        const { courseId, receiveUserEmail, code } = data

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        try {
            const receiveUser = await this.accountMySqlRepository.findOneBy({ email: receiveUserEmail })

            if (!receiveUser) {
                throw new NotFoundException("Receive user not found or they aren't a CiStudy member")
            }

            const enrolled = await this.enrolledInfoMySqlRepository.findOne({
                where: {
                    accountId: receiveUser.accountId,
                    courseId
                }
            })

            if (enrolled) {
                throw new ConflictException("This user is already enrolled to this course")
            }

            // const cachedTransaction = (await this.cacheManager.get(code)) as CodeValue
            // if (!cachedTransaction) throw new NotFoundException("The code either expired or never existed.")

            // const { transactionHash } = cachedTransaction
            // const transaction = await this.transactionMongoModel.findOne({
            //     transactionHash
            // })
            // if (!transaction) {
            //     throw new NotFoundException("Transaction not found.")
            // }

            // const { _id, isValidated, value } = transaction

            // if (isValidated) throw new ConflictException("This transaction is validated.")

            const { enableDiscount, discountPrice, price: coursePrice, title } = await this.courseMySqlRepository.findOne({
                where: {
                    courseId
                }
            }
            )

            const price = enableDiscount ? discountPrice : coursePrice
            // if (BigInt(value) < computeRaw(price)) throw new ConflictException("Value is not enough.")

            // await this.transactionMongoModel.findOneAndUpdate({ _id }, {
            //     isValidated: true
            // },
            // )

            const { enrolledInfoId } = await this.enrolledInfoMySqlRepository.save({
                enrolledInfoId: enrolled?.enrolledInfoId,
                courseId,
                accountId: receiveUser.accountId,
                enrolled: true,
                priceAtEnrolled: price
            })

            const course = await this.courseMySqlRepository.findOne({
                where: {
                    courseId
                },
                relations: {
                    sections: {
                        lessons: true
                    }
                }
            });

            const progresses = course.sections.reduce((acc, section) => {
                section.lessons.forEach(lesson => {
                    acc.push({
                        accountId: receiveUser.accountId,
                        lessonId: lesson.lessonId,
                        isCompleted: false // Giả sử bạn muốn khởi tạo với `isCompleted` là false
                    });
                });
                return acc;
            }, []);

            await this.progressMySqlRepository.save(progresses);

            await queryRunner.commitTransaction()
            return `User with email ${receiveUserEmail} have received and enrolled to course ${course.title}`
        } catch (ex) {
            await queryRunner.rollbackTransaction()
            throw ex
        } finally {
            await queryRunner.release()
        }

    }
}

