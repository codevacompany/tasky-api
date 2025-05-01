import { Injectable } from '@nestjs/common';
import emailValidator from 'deep-email-validator';
import * as fs from 'fs';
import { google } from 'googleapis';
import Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import Mail from 'nodemailer/lib/mailer';
import * as path from 'path';
import { CustomInternalServerErrorException } from '../../exceptions/http-exception';

@Injectable()
export class EmailService {
    constructor() {
        Handlebars.registerPartial('layout', this.getTemplateFile('layout'));
    }

    async isValid(email: string) {
        const { valid } = await emailValidator(email);

        return valid;
    }

    async sendMail(options: Mail.Options) {
        console.info('Sending email');

        // Skip email sending in development environment
        if (process.env.NODE_ENV === 'dev') {
            console.info('Skipping email in development environment');
            return { message: 'Email skipped in development mode' };
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.ID_CLIENT,
            process.env.SECRET_KEY,
            process.env.HOST_PLAYGROUND,
        );

        oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

        const acessToken = (await oauth2Client.getAccessToken()).token;

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USERNAME,
                accessToken: acessToken,
            },
        });

        return transport
            .sendMail(options)
            .then(() => {
                console.info('Email successfully sent');
                return { message: 'Email successfully sent' };
            })
            .catch((error) => {
                console.error(`Error sending email: ${error.message}`);
                throw new CustomInternalServerErrorException({
                    code: 'error-sending-email',
                    message: error.message,
                });
            });
    }

    compileTemplate(templateName: string, data: Record<string, any> = {}) {
        const template = Handlebars.compile(this.getTemplateFile(templateName));
        return template(data);
    }

    private getTemplateFile(templateName: string) {
        return fs.readFileSync(path.join(__dirname, 'templates', `${templateName}.hbs`)).toString();
    }

    private mountMessage(options: Mail.Options) {
        const mailComposer = new MailComposer(options);
        return mailComposer.compile().build();
    }
}
