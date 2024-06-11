import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { QuizQuestionAnswerEntity } from "./quiz-question-answer.entity";
import { LectureEntity } from "./lecture.entity";
import { QuizEntity } from "./quiz.entity";
import { QuizQuestionMediaEntity } from "./quiz-question-media.entity";

@ObjectType()
@Entity("quiz-question")
export class QuizQuestionEntity {

    @Field(() => ID)
    @PrimaryGeneratedColumn("uuid")
    quizQuestionId: string

    @Field(() => ID)
    @Column({ type: "uuid", length: 36 })
    quizId: string

    @Field(() => String)
    @Column({ type: "varchar", length: 2000 })
    question: string
    
    @Field(() => [QuizQuestionMediaEntity], { nullable: true })
    @OneToMany(() => QuizQuestionMediaEntity, (quizMedia) => quizMedia.quiz, {
        cascade: true, nullable: true
    })
    questionMedias: Array<QuizQuestionMediaEntity>

    @Field(() => [QuizQuestionAnswerEntity])
    @OneToMany(() => QuizQuestionAnswerEntity, (quizAnswer) => quizAnswer.quizQuestion, { onDelete: "CASCADE", onUpdate: "CASCADE" })
    answers: Array<QuizQuestionAnswerEntity>

    @Field(() => Date)
    @CreateDateColumn()
    createdAt: Date

    @Field(() => Date)
    @UpdateDateColumn()
    updatedAt: Date

    @Field(() => QuizEntity)
    @ManyToOne(() => QuizEntity, (quiz) => quiz.questions, {onDelete : "CASCADE"})
    @JoinColumn({ name: "quizId" })
    quiz: QuizEntity
}