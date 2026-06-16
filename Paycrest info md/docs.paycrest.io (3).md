> ## Documentation Index
> Fetch the complete documentation index at: https://docs.paycrest.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Market Rate

Returns **buy** and **sell** market rate **bands** (reference rate plus min/max tolerance) for a token/fiat pair. Use this to validate whether a sender-provided `rate` on order creation is within allowed bounds.

## Response shape (`data`)

| Field  | Type              | Description                                                |
| ------ | ----------------- | ---------------------------------------------------------- |
| `buy`  | object (optional) | Buy-side band: `marketRate`, `minimumRate`, `maximumRate`  |
| `sell` | object (optional) | Sell-side band: `marketRate`, `minimumRate`, `maximumRate` |

Numeric values are returned as **strings** (decimal). Either side may be omitted depending on corridor configuration.

<Note>
  **`GET /v1/provider/rates/{token}/{fiat}`** uses the same response shape as this v2 route.
</Note>


## OpenAPI

````yaml openapi-v2.yaml GET /provider/rates/{token}/{fiat}
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
  /provider/rates/{token}/{fiat}:
    get:
      tags:
        - Provider
      summary: Get market rate
      parameters:
        - in: path
          name: token
          required: true
          schema:
            type: string
        - in: path
          name: fiat
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Market rate
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/MarketRateResponse'
        '400':
          description: Bad request
        '401':
          description: Unauthorized
      security:
        - ApiKeyAuth: []
      servers:
        - url: https://api.paycrest.io/v2
components:
  schemas:
    StandardResponse:
      type: object
      properties:
        status:
          type: string
          example: success
        message:
          type: string
          example: Operation successful
        data:
          type: object
          description: The actual response data (e.g., ReceiveAddressResponse, etc.)
    MarketRateResponse:
      type: object
      description: >-
        Market rate bounds split by side. Either or both of `buy` and `sell` may
        be present depending on corridor configuration.
      properties:
        buy:
          $ref: '#/components/schemas/MarketRateSide'
        sell:
          $ref: '#/components/schemas/MarketRateSide'
    MarketRateSide:
      type: object
      description: Tolerance band for one side (buy or sell) of the market rate.
      properties:
        marketRate:
          type: string
          description: Reference market rate for this side (fiat per crypto).
        minimumRate:
          type: string
          description: Minimum allowed rate for this side.
        maximumRate:
          type: string
          description: Maximum allowed rate for this side.
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: API-Key

````