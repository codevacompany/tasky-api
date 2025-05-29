import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AccessProfile } from '../../shared/common/access-profile';
import {
    CustomBadRequestException,
    CustomConflictException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { CnpjService } from '../../shared/services/cnpj/cnpj.service';
import { EmailService } from '../../shared/services/email/email.service';
// import { TokenService } from '../../shared/services/token/token.service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { DepartmentService } from '../department/department.service';
// import { LegalDocumentService } from '../legal-document/legal-document.service';
import { RoleName } from '../role/entities/role.entity';
import { RoleRepository } from '../role/role.repository';
import { SubscriptionType } from '../subscription/entities/subscription.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { TenantService } from '../tenant/tenant.service';
import { UserService } from '../user/user.service';
import { CreateSignUpDto } from './dtos/create-sign-up.dto';
import { SignUp, SignUpStatus } from './entities/sign-up.entity';
import { SignUpRepository } from './sign-up.repository';

@Injectable()
export class SignUpService {
    constructor(
        private readonly signUpRepository: SignUpRepository,
        private readonly tenantService: TenantService,
        private readonly emailService: EmailService,
        private readonly cnpjService: CnpjService,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly roleRepository: RoleRepository,
        private readonly departmentService: DepartmentService,
        // private readonly legalDocumentService: LegalDocumentService,
        private readonly subscriptionService: SubscriptionService,
        // private readonly tokenService: TokenService,
    ) {}

    async create(createSignUpDto: CreateSignUpDto): Promise<SignUp> {
        const signUpExists = await this.findByCnpj(createSignUpDto.cnpj);

        if (signUpExists) {
            throw new CustomConflictException({
                code: 'sign-up-already-exists',
                message: 'Sign-up already exists',
            });
        }

        const cnpjData = await this.cnpjService.validateAndFetchData(createSignUpDto.cnpj);

        if (!createSignUpDto.termsAccepted) {
            throw new CustomBadRequestException({
                code: 'terms-not-accepted',
                message: 'You must accept the terms of use to continue',
            });
        }

        if (!createSignUpDto.privacyPolicyAccepted) {
            throw new CustomBadRequestException({
                code: 'privacy-policy-not-accepted',
                message: 'You must accept the privacy policy to continue',
            });
        }

        // Validate that the terms version exists
        // if (createSignUpDto.termsVersion) {
        //     try {
        //         await this.legalDocumentService.findByTypeAndVersion(
        //             LegalDocumentType.TERMS_OF_SERVICE,
        //             createSignUpDto.termsVersion,
        //         );
        //     } catch (error) {
        //         throw new CustomBadRequestException({
        //             code: 'invalid-terms-version',
        //             message: `Terms of service version ${createSignUpDto.termsVersion} not found`,
        //         });
        //     }
        // } else {
        //     // Get the active terms version
        //     try {
        //         const activeTerms = await this.legalDocumentService.getActiveDocumentByType(
        //             LegalDocumentType.TERMS_OF_SERVICE,
        //         );
        //         createSignUpDto.termsVersion = activeTerms.version;
        //     } catch (error) {
        //         // If no active terms, use default version
        //         createSignUpDto.termsVersion = '1.0';
        //     }
        // }

        // Validate that the privacy policy version exists
        // if (createSignUpDto.privacyPolicyVersion) {
        //     try {
        //         await this.legalDocumentService.findByTypeAndVersion(
        //             LegalDocumentType.PRIVACY_POLICY,
        //             createSignUpDto.privacyPolicyVersion,
        //         );
        //     } catch (error) {
        //         throw new CustomBadRequestException({
        //             code: 'invalid-privacy-policy-version',
        //             message: `Privacy policy version ${createSignUpDto.privacyPolicyVersion} not found`,
        //         });
        //     }
        // } else {
        //     // Get the active privacy policy version
        //     try {
        //         const activePrivacyPolicy = await this.legalDocumentService.getActiveDocumentByType(
        //             LegalDocumentType.PRIVACY_POLICY,
        //         );
        //         createSignUpDto.privacyPolicyVersion = activePrivacyPolicy.version;
        //     } catch (error) {
        //         // If no active privacy policy, use default version
        //         createSignUpDto.privacyPolicyVersion = '1.0';
        //     }
        // }

        const signUp = this.signUpRepository.create({
            companyName: createSignUpDto.companyName,
            email: createSignUpDto.email,
            contactName: createSignUpDto.contactName,
            contactCpf: createSignUpDto.contactCpf,
            contactEmail: createSignUpDto.contactEmail,
            contactPhone: createSignUpDto.contactPhone,
            status: SignUpStatus.PENDING,
            cnpj: createSignUpDto.cnpj,
            cep: cnpjData.cep,
            state: cnpjData.uf,
            city: cnpjData.municipio,
            neighborhood: cnpjData.bairro,
            street: cnpjData.logradouro,
            number: cnpjData.numero,
            complement: cnpjData.complemento,
            phoneNumber: cnpjData.telefone,
            companySize: cnpjData.porte,
            mainActivity: cnpjData.atividade_principal?.[0]?.text || '',
            termsAccepted: createSignUpDto.termsAccepted,
            termsAcceptedAt: new Date(),
            termsVersion: createSignUpDto.termsVersion,
            privacyPolicyAccepted: createSignUpDto.privacyPolicyAccepted,
            privacyPolicyAcceptedAt: new Date(),
            privacyPolicyVersion: createSignUpDto.privacyPolicyVersion,
        });

        const savedSignUp = await this.signUpRepository.save(signUp);

        await this.emailService.sendMail({
            subject: 'Nova solicitação de cadastro',
            html: this.emailService.compileTemplate('sign-up-notification', {
                companyName: savedSignUp.companyName,
                contactName: savedSignUp.contactName,
                contactEmail: savedSignUp.contactEmail,
            }),
            to: process.env.ADMIN_EMAIL,
        });

        await this.emailService.sendMail({
            subject: 'Solicitação de cadastro recebida',
            html: this.emailService.compileTemplate('sign-up-confirmation', {
                companyName: savedSignUp.companyName,
                contactName: savedSignUp.contactName,
            }),
            to: savedSignUp.contactEmail,
        });

        return savedSignUp;
    }

    async findAll(
        where?: { companyName?: string; status?: string },
        options?: QueryOptions<SignUp>,
    ): Promise<PaginatedResponse<SignUp>> {
        const query = this.buildQuery(where);

        const [items, total] = await this.signUpRepository.findAndCount({
            where: query.where,
            skip: (options.page - 1) * options.limit,
            take: options.limit,
            order: options.order || { createdAt: 'DESC' },
        });

        return {
            items,
            total,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(total / options.limit),
        };
    }

    async findByCnpj(cnpj: string): Promise<SignUp> {
        const signUp = await this.signUpRepository.findOne({
            where: { cnpj },
        });

        return signUp;
    }

    async findOne(id: number): Promise<SignUp> {
        const signUp = await this.signUpRepository.findOne({
            where: { id },
        });

        if (!signUp) {
            throw new CustomNotFoundException({
                message: 'Sign-up request not found',
                code: 'sign-up-not-found',
            });
        }

        return signUp;
    }

    async findByActivationToken(token: string): Promise<SignUp> {
        const signUp = await this.signUpRepository.findOne({
            where: { activationToken: token },
        });

        if (!signUp) {
            throw new CustomNotFoundException({
                message: 'Invalid activation token',
                code: 'invalid-activation-token',
            });
        }

        return signUp;
    }

    async approveSignUp(id: number): Promise<SignUp> {
        const signUp = await this.findOne(id);

        if (signUp.status === SignUpStatus.APPROVED) {
            throw new CustomBadRequestException({
                message: 'This sign-up has already been approved',
                code: 'sign-up-already-approved',
            });
        }

        if (signUp.status === SignUpStatus.COMPLETED) {
            throw new CustomNotFoundException({
                message: 'This sign-up has already been completed',
                code: 'sign-up-already-completed',
            });
        }

        const activationToken = uuidv4();

        await this.signUpRepository.update(id, {
            status: SignUpStatus.APPROVED,
            activationToken,
        });

        const updatedSignUp = await this.findOne(id);

        this.emailService.sendMail({
            subject: 'Complete seu cadastro no Tasky System',
            html: this.emailService.compileTemplate('complete-your-sign-up', {
                companyName: updatedSignUp.companyName,
                contactName: updatedSignUp.contactName,
                activationToken,
                frontendUrl: process.env.FRONTEND_URL,
            }),
            to: updatedSignUp.contactEmail,
        });

        return updatedSignUp;
    }

    async rejectSignUp(id: number): Promise<SignUp> {
        const signUp = await this.findOne(id);

        if (signUp.status === SignUpStatus.REJECTED) {
            return signUp;
        }

        if (signUp.status === SignUpStatus.COMPLETED) {
            throw new CustomNotFoundException({
                message: 'This sign-up has already been completed',
                code: 'sign-up-already-completed',
            });
        }

        await this.signUpRepository.update(id, {
            status: SignUpStatus.REJECTED,
        });

        const updatedSignUp = await this.findOne(id);

        this.emailService.sendMail({
            subject: 'Sobre sua solicitação de cadastro no Tasky System',
            html: this.emailService.compileTemplate('sign-up-rejected', {
                companyName: updatedSignUp.companyName,
                contactName: updatedSignUp.contactName,
            }),
            to: updatedSignUp.contactEmail,
        });

        return updatedSignUp;
    }

    async completeSignUp(token: string, customKey: string, password: string) {
        const signUp = await this.findByActivationToken(token);

        if (signUp.status !== SignUpStatus.APPROVED) {
            throw new CustomNotFoundException({
                message: 'This sign-up request is not approved',
                code: 'sign-up-not-approved',
            });
        }

        const tenant = await this.tenantService.create({
            name: signUp.companyName,
            customKey,
            email: signUp.email,
            cnpj: signUp.cnpj,
            phoneNumber: signUp.phoneNumber,
            cep: signUp.cep,
            state: signUp.state,
            city: signUp.city,
            neighborhood: signUp.neighborhood,
            street: signUp.street,
            number: signUp.number,
            complement: signUp.complement,
            companySize: signUp.companySize,
            mainActivity: signUp.mainActivity,
            termsAccepted: signUp.termsAccepted,
            termsAcceptedAt: signUp.termsAcceptedAt,
            termsVersion: signUp.termsVersion,
            privacyPolicyAccepted: signUp.privacyPolicyAccepted,
            privacyPolicyAcceptedAt: signUp.privacyPolicyAcceptedAt,
            privacyPolicyVersion: signUp.privacyPolicyVersion,
        });

        const accessProfile = new AccessProfile();
        accessProfile.roleId = 1; // Set as superuser to create subscription
        accessProfile.tenantId = tenant.id;

        // Create a 14-day trial subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);

        await this.subscriptionService.create(accessProfile, {
            tenantId: tenant.id,
            startDate,
            endDate,
            type: SubscriptionType.TRIAL,
        });

        const tenantAdminRole = await this.roleRepository.findOneBy({
            name: RoleName.TenantAdmin,
        });

        if (!tenantAdminRole) {
            throw new CustomNotFoundException({
                message: 'TenantAdmin role not found',
                code: 'role-not-found',
            });
        }

        const defaultDepartment = await this.departmentService.create(accessProfile, {
            name: 'Diretoria',
        });

        const userData = await this.userService.superAdminCreate(accessProfile, {
            tenantId: tenant.id,
            firstName: signUp.contactName.split(' ')[0],
            lastName: signUp.contactName.split(' ').slice(1).join(' ') || '',
            email: signUp.contactEmail,
            password,
            departmentId: defaultDepartment.id,
            roleId: tenantAdminRole.id,
            isActive: true,
        });

        await this.signUpRepository.update(signUp.id, {
            status: SignUpStatus.COMPLETED,
            activationToken: null, // Clear the token after use
            completedAt: new Date(),
        });

        await this.emailService.sendMail({
            subject: 'Bem-vindo ao Tasky System',
            html: this.emailService.compileTemplate('sign-up-completed', {
                companyName: signUp.companyName,
                contactName: signUp.contactName,
                customKey,
                frontendUrl: process.env.FRONTEND_URL,
                trialDays: 14, // Add trial period to the email
            }),
            to: signUp.contactEmail,
        });

        return userData;
    }

    private buildQuery(where?: { companyName?: string; status?: string }) {
        const queryWhere: any = { ...where };

        if (where?.companyName) {
            queryWhere.companyName = ILike(`%${where.companyName}%`);
        }

        return { where: queryWhere };
    }
}
