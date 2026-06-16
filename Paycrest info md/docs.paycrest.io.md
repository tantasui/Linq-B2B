> ## Documentation Index
> Fetch the complete documentation index at: https://docs.paycrest.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Initiate Order

> Creates a new payment order.

- **Offramp** (stablecoin → fiat): set `source.type = "crypto"` and `destination.type = "fiat"`.
  The response `providerAccount` contains a `receiveAddress` to send tokens to.
- **Onramp** (fiat → stablecoin): set `source.type = "fiat"` and `destination.type = "crypto"`.
  The response `providerAccount` contains a virtual bank account for the user to deposit fiat into.




## OpenAPI

````yaml openapi-v2.yaml POST /sender/orders
openapi: 3.0.3
info:
  title: Paycrest Aggregator API
  version: 1.0.0
  description: >
    OpenAPI schema for the Paycrest Aggregator API. This covers sender,
    provider, and general endpoints.
servers:
  - url: https://api.paycrest.io/v2
security: []
tags:
  - name: Sender
    description: Endpoints for senders to create and manage payment orders
  - name: Provider
    description: Endpoints for providers to manage and fulfill orders
  - name: General
    description: General protocol and utility endpoints
paths:
  /sender/orders:
    post:
      tags:
        - Sender
      summary: Create a v2 payment order (offramp or onramp)
      description: >
        Creates a new payment order.


        - **Offramp** (stablecoin → fiat): set `source.type = "crypto"` and
        `destination.type = "fiat"`.
          The response `providerAccount` contains a `receiveAddress` to send tokens to.
        - **Onramp** (fiat → stablecoin): set `source.type = "fiat"` and
        `destination.type = "crypto"`.
          The response `providerAccount` contains a virtual bank account for the user to deposit fiat into.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V2PaymentOrderPayload'
            examples:
              offramp:
                summary: Offramp — USDT on Base → NGN bank account
                value:
                  amount: '100'
                  source:
                    type: crypto
                    currency: USDT
                    network: base
                    refundAddress: 0xYourAddress
                  destination:
                    type: fiat
                    currency: NGN
                    recipient:
                      institution: GTBINGLA
                      accountIdentifier: '1234567890'
                      accountName: John Doe
                      memo: Payment
              onramp:
                summary: Onramp — NGN → USDT on Base
                value:
                  amount: '50000'
                  amountIn: fiat
                  source:
                    type: fiat
                    currency: NGN
                    refundAccount:
                      institution: GTBINGLA
                      accountIdentifier: '1234567890'
                      accountName: John Doe
                  destination:
                    type: crypto
                    currency: USDT
                    recipient:
                      address: 0xRecipientWalletAddress
                      network: base
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  message:
                    type: string
                    example: Payment order created successfully
                  data:
                    $ref: '#/components/schemas/V2PaymentOrderResponse'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '503':
          description: No provider available for this corridor
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security:
        - ApiKeyAuth: []
      servers:
        - url: https://api.paycrest.io/v2
components:
  schemas:
    V2PaymentOrderPayload:
      type: object
      required:
        - amount
        - source
        - destination
      properties:
        amount:
          type: string
          description: >-
            Payment amount. Denomination is determined by `amountIn` (defaults
            to crypto units).
          example: '100'
        amountIn:
          type: string
          enum:
            - crypto
            - fiat
          description: >-
            Specifies whether `amount` is denominated in crypto or fiat.
            Defaults to `crypto`.
        rate:
          type: string
          description: >-
            Quoted exchange rate (fiat per crypto unit). Optional — protocol
            uses best available rate if omitted.
        senderFee:
          type: string
          description: Fixed sender fee in crypto units.
        senderFeePercent:
          type: string
          description: >-
            Sender fee as a percentage of the order amount (alternative to
            senderFee).
        reference:
          type: string
          description: Your internal reference ID for this order.
        source:
          description: >-
            Polymorphic source — set `type: "crypto"` for offramp or `type:
            "fiat"` for onramp.
          oneOf:
            - $ref: '#/components/schemas/V2CryptoSource'
            - $ref: '#/components/schemas/V2FiatSource'
          discriminator:
            propertyName: type
            mapping:
              crypto:
                $ref: '#/components/schemas/V2CryptoSource'
              fiat:
                $ref: '#/components/schemas/V2FiatSource'
        destination:
          description: >-
            Polymorphic destination — set `type: "fiat"` for offramp or `type:
            "crypto"` for onramp.
          oneOf:
            - $ref: '#/components/schemas/V2FiatDestination'
            - $ref: '#/components/schemas/V2CryptoDestination'
          discriminator:
            propertyName: type
            mapping:
              fiat:
                $ref: '#/components/schemas/V2FiatDestination'
              crypto:
                $ref: '#/components/schemas/V2CryptoDestination'
    V2PaymentOrderResponse:
      type: object
      description: Response returned when creating an order
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
        orderType:
          type: string
          enum:
            - regular
            - otc
        timestamp:
          type: string
          format: date-time
        amount:
          type: string
          description: Crypto amount in token units
        rate:
          type: string
        senderFee:
          type: string
        senderFeePercent:
          type: string
        transactionFee:
          type: string
        reference:
          type: string
        providerAccount:
          description: >-
            Crypto provider account for offramp; fiat provider account (virtual
            account) for onramp
          oneOf:
            - $ref: '#/components/schemas/V2CryptoProviderAccount'
            - $ref: '#/components/schemas/V2FiatProviderAccount'
        source:
          oneOf:
            - $ref: '#/components/schemas/V2CryptoSource'
            - $ref: '#/components/schemas/V2FiatSource'
        destination:
          oneOf:
            - $ref: '#/components/schemas/V2FiatDestination'
            - $ref: '#/components/schemas/V2CryptoDestination'
    ErrorResponse:
      type: object
      properties:
        status:
          type: string
          example: error
        message:
          type: string
          example: Error message
        data:
          nullable: true
          description: >-
            null on most errors; an array of field-level errors on validation
            failures
          oneOf:
            - type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string
            - type: object
              additionalProperties: true
    V2CryptoSource:
      type: object
      required:
        - type
        - currency
        - network
        - refundAddress
      properties:
        type:
          type: string
          enum:
            - crypto
        currency:
          type: string
          description: Stablecoin symbol (e.g. USDT, USDC, cNGN)
        network:
          type: string
          enum:
            - ethereum
            - base
            - bnb-smart-chain
            - lisk
            - scroll
            - celo
            - arbitrum-one
            - polygon
        refundAddress:
          type: string
          description: Wallet address for refunds if the order can't be fulfilled
    V2FiatSource:
      type: object
      required:
        - type
        - currency
        - refundAccount
      properties:
        type:
          type: string
          enum:
            - fiat
        currency:
          type: string
          description: Fiat currency code (e.g. NGN, KES, BRL)
        country:
          type: string
          description: ISO 3166-1 alpha-2 country code (optional)
        refundAccount:
          $ref: '#/components/schemas/V2FiatRefundAccount'
    V2FiatDestination:
      type: object
      required:
        - type
        - currency
        - recipient
      properties:
        type:
          type: string
          enum:
            - fiat
        currency:
          type: string
          description: Fiat currency code (e.g. NGN, KES)
        country:
          type: string
          description: ISO 3166-1 alpha-2 country code (optional)
        providerId:
          type: string
          description: Pin order to a specific provider (optional)
        recipient:
          $ref: '#/components/schemas/V2FiatRecipient'
    V2CryptoDestination:
      type: object
      required:
        - type
        - currency
        - recipient
      properties:
        type:
          type: string
          enum:
            - crypto
        currency:
          type: string
          description: Stablecoin symbol (e.g. USDT, USDC)
        providerId:
          type: string
        recipient:
          $ref: '#/components/schemas/V2CryptoRecipient'
    V2CryptoProviderAccount:
      type: object
      description: Returned for offramp orders — the address to send stablecoins to
      properties:
        network:
          type: string
        receiveAddress:
          type: string
          description: EVM address to send stablecoins to
        validUntil:
          type: string
          format: date-time
          description: Deadline for the stablecoin deposit
    V2FiatProviderAccount:
      type: object
      description: Returned for onramp orders — the virtual account to deposit fiat into
      properties:
        institution:
          type: string
          description: Bank or mobile provider code
        accountIdentifier:
          type: string
          description: Account number or mobile number to send fiat to
        accountName:
          type: string
        amountToTransfer:
          type: string
          description: Exact fiat amount the user must deposit
        currency:
          type: string
          description: Fiat currency code
        validUntil:
          type: string
          format: date-time
          description: Deadline — order expires if fiat not received by this time
    V2FiatRefundAccount:
      type: object
      required:
        - institution
        - accountIdentifier
        - accountName
      properties:
        institution:
          type: string
          description: >-
            Bank or mobile provider code (SWIFT prefix or Paycrest institution
            code)
        accountIdentifier:
          type: string
          description: Account number or mobile number
        accountName:
          type: string
          description: Account holder name
    V2FiatRecipient:
      type: object
      required:
        - institution
        - accountIdentifier
        - accountName
        - memo
      properties:
        institution:
          type: string
        accountIdentifier:
          type: string
        accountName:
          type: string
        memo:
          type: string
          description: Payment narration / reference
    V2CryptoRecipient:
      type: object
      required:
        - address
        - network
      properties:
        address:
          type: string
          description: Wallet address to receive stablecoins
        network:
          type: string
          enum:
            - ethereum
            - base
            - bnb-smart-chain
            - lisk
            - scroll
            - celo
            - arbitrum-one
            - polygon
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: API-Key

````