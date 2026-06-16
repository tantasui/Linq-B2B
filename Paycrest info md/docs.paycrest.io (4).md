> ## Documentation Index
> Fetch the complete documentation index at: https://docs.paycrest.io/llms.txt
> Use this file to discover all available pages before exploring further.

# List Supported Tokens

Retrieve a list of supported tokens.


## OpenAPI

````yaml openapi-v2.yaml GET /tokens
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
  /tokens:
    get:
      tags:
        - General
      summary: List supported tokens
      parameters:
        - in: query
          name: network
          schema:
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
              - asset-chain
      responses:
        '200':
          description: List of tokens
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
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/SupportedTokenResponse'
      servers:
        - url: https://api.paycrest.io/v2
components:
  schemas:
    SupportedTokenResponse:
      type: object
      properties:
        symbol:
          type: string
          description: >-
            Token symbol (USDT, USDC, cNGN). See [Supported
            Stablecoins](/resources/supported-stablecoins) for available
            options.
        contractAddress:
          type: string
        decimals:
          type: integer
        baseCurrency:
          type: string
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
            - asset-chain
          description: Network identifier for the blockchain

````