# Contrato da Engine Fiscal

Status atual: integrada com a engine local em Python.

Engine integrada:

- Pasta: `C:\Users\Windows\Familia Maestre - Fiscal`
- CLI: `python -m nf_ocr_engine.cli`
- Adaptador no sistema: `apps/backend/api/_lib/fiscal-engine.ts`

Variaveis opcionais:

- `FISCAL_ENGINE_ROOT`: caminho da pasta da engine fiscal.
- `FISCAL_ENGINE_PYTHON`: caminho do Python que executa a engine.

Rota usada pelo sistema:

- `POST /purchases/import-qr`

Entrada aceita:

```json
{
  "qrCodeRaw": "texto ou URL lida do QR Code",
  "url": "URL publica da NFC-e",
  "fileName": "cupom.pdf",
  "imageBase64": "imagem do cupom em base64",
  "pdfBase64": "PDF do cupom em base64",
  "text": "texto OCR ja extraido"
}
```

Saida normalizada para o sistema:

```json
{
  "qrCodeRaw": "",
  "url": "",
  "accessKey": "",
  "supplierName": "",
  "tradeName": "",
  "documentNumber": "",
  "purchaseDate": "2026-06-28",
  "totalAmount": 0,
  "paymentMethod": "PIX",
  "items": [
    {
      "productName": "",
      "unitPrice": 0,
      "unit": "un",
      "taxes": 0,
      "discount": 0,
      "quantity": 1
    }
  ],
  "warnings": []
}
```

Observacao:

No ambiente local, o backend chama diretamente a engine Python. Em producao, essa pasta Windows precisa virar um servico/funcao hospedada ou ser empacotada no ambiente de deploy com Python, dependencias e Tesseract.
