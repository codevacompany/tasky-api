import { Injectable } from '@nestjs/common';
import emailValidator from 'deep-email-validator';
import * as fs from 'fs';
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
        if (process.env.APP_ENV === 'dev') {
            console.info('Skipping email in development environment');
            return { message: 'Email skipped in development mode' };
        }

        const smtpConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10),
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        };

        const transport = nodemailer.createTransport(smtpConfig);

        const emailFrom = process.env.EMAIL_USERNAME;

        // Generate plain text version if HTML is provided but text is not
        let text = options.text;
        if (options.html && !text && typeof options.html === 'string') {
            text = this.htmlToText(options.html);
        }

        const mailOptions: Mail.Options = {
            ...options,
            from: options.from || `Tasky Pro <${emailFrom}>`,
            text: text || options.text,
        };

        return transport
            .sendMail(mailOptions)
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

    /**
     * Converts HTML to plain text by removing HTML tags and preserving basic formatting
     */
    private htmlToText(html: string): string {
        if (!html) return '';

        // Remove script and style elements
        let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Convert common HTML elements to text equivalents
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n\n');
        text = text.replace(/<\/div>/gi, '\n');
        text = text.replace(/<\/li>/gi, '\n');
        text = text.replace(/<li[^>]*>/gi, '• ');
        text = text.replace(/<h[1-6][^>]*>/gi, '\n');
        text = text.replace(/<\/h[1-6]>/gi, '\n\n');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'");

        // Clean up whitespace
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
        text = text.replace(/[ \t]+/g, ' ');
        text = text.trim();

        return text;
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
