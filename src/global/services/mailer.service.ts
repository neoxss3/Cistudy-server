import { CourseVerifyStatus, TokenType } from "@common"
import { appConfig, jwtConfig, servicesConfig } from "@config"
import { CourseMySqlEntity } from "@database"
import { Injectable } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { createTransport } from "nodemailer"
import { acceptCourseMail, rejectCourseMail, reportAccountMail, verifyAccountMail } from "../templates/mail.template"

@Injectable()
export class MailerService {

    constructor(private readonly jwtService: JwtService) { }

    private transporter = createTransport({
        service: "gmail",
        auth: {
            user: servicesConfig().mailer.user,
            pass: servicesConfig().mailer.pass,
        },
    })

    private verifyCourseMailOptions = (email: string, username: string, course: CourseMySqlEntity, note: string, verifyStatus: CourseVerifyStatus) => {
        const { title, courseId } = course
        const acceptHTML = acceptCourseMail(username, email, title)
        const rejectHTML = rejectCourseMail(username, email, title, note, courseId)
        return {
            from: servicesConfig().mailer.user,
            to: email,
            subject: "You have new updates on your submitted course",
            html: (verifyStatus === CourseVerifyStatus.Approved) ? acceptHTML : rejectHTML,

        }
    }

    private verifyAccountMailOptions = (accountId: string, email: string, username: string) => {
        const frontendUrl = appConfig().frontendUrl
        const token = this.jwtService.sign(
            { accountId, type: TokenType.Verify },
            { secret: jwtConfig().secret },
        )
        console.log(frontendUrl)
        return {
            from: servicesConfig().mailer.user,
            to: email,
            subject: "REGISTRATION CONFIRMATION - CISTUDY",
            html: verifyAccountMail(username, email, frontendUrl, token),
        }
    }

    private reportAccountMailOptions = (reportedUserEmail: string, reporterUsername: string, reportedUsername: string, reportedDate: Date, title: string, description: string, processStatus: string ,processNote: string) => {
        return {
            from: servicesConfig().mailer.user,
            to: reportedUserEmail,
            subject: "You have received a report.",
            html: reportAccountMail(reporterUsername, reportedUsername, reportedDate, title, description, processStatus, processNote),

        }
    }
    async sendVerifyRegistrationMail(accountId: string, email: string, username: string) {
        return await this.transporter.sendMail(this.verifyAccountMailOptions(accountId, email, username))
    }

    async sendVerifyCourseMail(email: string, username: string, course: CourseMySqlEntity, note: string, verifyStatus: CourseVerifyStatus) {
        return await this.transporter.sendMail(this.verifyCourseMailOptions(email, username, course, note, verifyStatus))
    }

    async sendReportAccountMail(reportedUserEmail: string, reporterUsername: string, reportedUsername: string, reportedDate: Date, title: string, description: string, processStatus: string, processNote: string) {
        return await this.transporter.sendMail(this.reportAccountMailOptions(reportedUserEmail, reporterUsername, reportedUsername, reportedDate, title, description, processStatus, processNote))
    }
}
