import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { CustomBadRequestException } from '../../exceptions/http-exception';

export interface CnpjData {
    status: string;
    cnpj: string;
    nome: string;
    fantasia: string;
    porte: string;
    atividade_principal: { code: string; text: string }[];
    logradouro: string;
    numero: string;
    complemento: string;
    cep: string;
    bairro: string;
    municipio: string;
    uf: string;
    email: string;
    telefone: string;
    situacao: string;
}

@Injectable()
export class CnpjService {
    private readonly API_URL = 'https://receitaws.com.br/v1/cnpj';

    constructor(private readonly httpService: HttpService) {}

    async validateAndFetchData(cnpj: string): Promise<CnpjData> {
        try {
            // Normalize CNPJ (remove all non-digit characters)
            const normalizedCnpj = cnpj.replace(/[^\d]+/g, '');

            // Make GET request to ReceitaWS API
            const { data } = await lastValueFrom(
                this.httpService.get<CnpjData>(`${this.API_URL}/${normalizedCnpj}`),
            );

            // Check if the response indicates an error
            if (data.status === 'ERROR') {
                throw new CustomBadRequestException({
                    code: 'invalid-cnpj',
                    message: 'The provided CNPJ is invalid or not found',
                });
            }

            return data;
        } catch (error) {
            if (error instanceof CustomBadRequestException) {
                throw error;
            }

            throw new CustomBadRequestException({
                code: 'cnpj-validation-failed',
                message: error.message || 'Failed to validate CNPJ',
            });
        }
    }
}
