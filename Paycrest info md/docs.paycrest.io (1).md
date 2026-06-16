> ## Documentation Index
> Fetch the complete documentation index at: https://docs.paycrest.io/llms.txt
> Use this file to discover all available pages before exploring further.

# List Orders



## OpenAPI

````yaml openapi-v2.yaml GET /sender/orders
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
    get:
      tags:
        - Sender
      summary: List v2 payment orders
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            default: 1
        - in: query
          name: pageSize
          schema:
            type: integer
            default: 10
        - in: query
          name: status
          schema:
            type: string
            enum:
              - initiated
              - deposited
              - pending
              - fulfilling
              - fulfilled
              - validated
              - settling
              - settled
              - cancelled
              - refunding
              - refunded
              - expired
      responses:
        '200':
          description: List of orders
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  data:
                    $ref: '#/components/schemas/V2PaymentOrderListResponse'
        '401':
          description: Unauthorized
      security:
        - ApiKeyAuth: []
      servers:
        - url: https://api.paycrest.io/v2
components:
  schemas:
    V2PaymentOrderListResponse:
      type: object
      properties:
        total:
          type: integer
        page:
          type: integer
        pageSize:
          type: integer
        orders:
          type: array
          items:
            $ref: '#/components/schemas/V2PaymentOrderGetResponse'
    V2PaymentOrderGetResponse:
      type: object
      description: Response for a single order (or list item)
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
          enum:
            - initiated
            - deposited
            - pending
            - fulfilling
            - fulfilled
            - validated
            - settling
            - settled
            - cancelled
            - refunding
            - refunded
            - expired
        orderType:
          type: string
          enum:
            - regular
            - otc
        direction:
          type: string
          enum:
            - offramp
            - onramp
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        amount:
          type: string
        amountInUsd:
          type: string
        amountPaid:
          type: string
        amountReturned:
          type: string
        percentSettled:
          type: string
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
        txHash:
          type: string
        providerAccount:
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