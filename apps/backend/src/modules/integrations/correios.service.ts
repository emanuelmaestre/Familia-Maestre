import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  ibge?: string;
  source: 'viacep' | 'correios';
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  erro?: boolean;
}

@Injectable()
export class CorreiosService {
  constructor(private readonly config: ConfigService) {}

  getStatus() {
    const username = this.config.get<string>('CORREIOS_USERNAME');
    const accessCode = this.config.get<string>('CORREIOS_ACCESS_CODE');
    const contract = this.config.get<string>('CORREIOS_CONTRACT');
    const card = this.config.get<string>('CORREIOS_POSTING_CARD');

    return {
      provider: 'Correios',
      cepLookup: 'enabled',
      pricingAndTracking: username && accessCode ? 'credentials_configured' : 'missing_credentials',
      contract: contract ? 'configured' : 'not_configured',
      postingCard: card ? 'configured' : 'not_configured',
      requiredEnv: [
        'CORREIOS_USERNAME',
        'CORREIOS_ACCESS_CODE',
        'CORREIOS_CONTRACT',
        'CORREIOS_POSTING_CARD',
      ],
    };
  }

  async lookupCep(input: string): Promise<CepAddress> {
    const cep = this.normalizeCep(input);
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
      throw new ServiceUnavailableException('Servico de CEP indisponivel no momento.');
    }

    const data = (await response.json()) as ViaCepResponse;

    if (data.erro) {
      throw new BadRequestException('CEP nao encontrado.');
    }

    return {
      cep: data.cep ?? this.formatCep(cep),
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
      ibge: data.ibge,
      source: 'viacep',
    };
  }

  private normalizeCep(input?: string) {
    const cep = String(input ?? '').replace(/\D/g, '');

    if (cep.length !== 8) {
      throw new BadRequestException('Informe um CEP valido com 8 digitos.');
    }

    return cep;
  }

  private formatCep(cep: string) {
    return `${cep.slice(0, 5)}-${cep.slice(5)}`;
  }
}
